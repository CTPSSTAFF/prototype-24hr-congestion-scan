// Data stores for TMC and speed data read in
tmc_data = [];
speed_data = [];

// Globals used to generate the data viz
var cell_w = 10,
    cell_h = 10;

var recs_per_hour = 6;
var num_time_recs = recs_per_hour * 24;
var minutes_per_rec = 10;

// Placholder; should be filled in for real when TMC data is read.
var num_tmcs = 100;

var left_margin = 170,
    top_margin = 20; // for now

var w = left_margin + (cell_w * num_time_recs),
    h = top_margin + (cell_h * num_tmcs);

// Function to return color for viz, based on speed in input data record.
// Special case: need to test for missing value in input data.
var speed_scale = function(d) {
	var retval, temp;
	var basic_scale = d3.scaleThreshold()
						.domain([10, 20, 30, 40, 50, Infinity])
						.range(['#cc1414', '#ff4719', '#ffa319', '#ffe019', '#affc19', '#32fa32']); 
	temp = basic_scale(d.speed);
	// Tests for missing speed value in input data - d3 scale function can't do this
	if (typeof temp === 'undefined') { 
		// console.log('tmc = ' + d.tmc)
		// console.log('hour = ' + d.time['hr']);
		// console.log('minute = ' + d.time['min']);
		// console.log('scale function returned: ' + temp);
		retval = "gray";
	} else {
		retval = temp;
	}
	return retval;
} // speed_scale()

// Dev - time scale
// Use 24 hours beginning January 1, 1900 as reference point
var timeScale = d3.scaleTime()
					.domain([new Date(1900, 0, 1, 0, 0), new Date(1900, 0, 1, 23, 50)])
					.range([0, cell_w * num_time_recs]);					
var xAxis = d3.axisTop()
				.scale(timeScale)
				.tickFormat(d3.timeFormat("%I %p"));

// Utility function used when parsing speed data
//
// Format of INRIX timestamp is yyyy-mm-dd hh:mm:ss
// Note: space between 'dd' and 'mm'.
// Return object with hour and minute, both as integers.
//
function get_time_from_timestamp(tstamp) {
	hms = tstamp.split(' ')[1].split(':');
	hr = +hms[0];
	min = +hms[1];
	return { 'hr' : hr, 'min' : min };
}

// Function to generate the data viz.
//
function generate_viz() {
	var svg = d3.select("#viz_div")
				.append("svg")
				.attr("width", w)
				.attr("height", h);
				
	var label_g = svg.append("g")
					.attr("id", "labels")
					.attr("transform", "translate(0," + top_margin + ")");
					
	label_g.selectAll("text.tmc_label")
		.data(tmc_data)
		.enter()
		.append("text")
			.attr("class", "tmc_label")
			.attr("x", 0)
			.attr("y", function(d, i) { return d.seq_num * cell_h; })
			.attr("text-anchor", "start")
			.attr("font-size", 10)
			.text(function(d, i) { return d.seg_begin; });
			
	var grid_g = svg.append("g")
					.attr("id", "grid")
					.attr("transform", "translate(" + left_margin + "," + top_margin + ")");
						
	grid_g.selectAll("rect.cell")
		.data(speed_data)
		.enter()
		.append("rect")
			.attr("class", "cell")
			.attr("x", function(d,i) { 
					var hr = d.time['hr'], min = d.time['min'];
					var tmp = ((hr * recs_per_hour) * cell_w) + (min / minutes_per_rec) * cell_w;
					// console.log('x = ' + tmp +  '    time: hour = ' + hr + ' min = ' + min);
					return tmp;
				})
			.attr("y", function(d,i) { 
						var tmc_rec = _.find(tmc_data, function(rec) { return rec.tmc == d.tmc; });
						var tmc_seq = tmc_rec['seq_num'];
						var tmp = tmc_seq * cell_h;
						return tmp;
					})
			.attr("width", cell_w)
			.attr("height", cell_h)
			.attr("fill", function(d,i){ return speed_scale(d); })
		// The following is temporary, for use during development
		.append("title")
			// .text(function(d,i) { var tmp; tmp = 'tmc: ' + d.tmc + ' ' + d.speed + ' MPH'; return tmp; });
			.text(function(d,i) { var tmp; tmp =  d.time['hr'] + ':' + d.time['min']; return tmp; });
			
	svg.append("g")
		.attr("class", "axis")
		.call(xAxis)
		// .attr("transform", "translate(" + left_margin + ",0)");
		.attr("transform", "translate(" + left_margin + "," + top_margin + ")");
		
	// The following grotesque - and hardly robust - hack is a work-around for d3.formatTime() 
	// not supporting rendering hour values between 01 and 09 without the leading zero.
	// C'mon, Mike - this would be an easy one to implement on your end.
	var xTickLabels = $('.axis text');
	var i,curText, newText;
	for (i = 0; i < xTickLabels.length; i++) {
		curText = $(xTickLabels[i]).html();
		if (curText[0] === '0') {
			newText = curText.replace('0', ' ');
			$(xTickLabels[i]).html(newText);
		}
	}

} //  generate_viz()

// Execution starts here:
// 		Kick things off by loading the TMC data;
// 		when this has completed, load the speed data;
// 		when that has completed, generate the viz.
//
d3.csv("data/i93_nb_tmcs.csv", function(d) {
	return {
		tmc : 		d.tmc,
		seq_num:	+d.seq_num,
		from_meas:	parseFloat(d.from_meas),
		distance:	parseFloat(d.distance),
		seg_begin:	d.seg_begin,
		seg_end:	d.seg_end,
		spd_limit:	+d.spd_limit
	};
}).then(function(data) {
	tmc_data = data;

	// Now load the speed data
	d3.csv("data/i93_nb_2020-03-13.csv", function(d) {
		return {
			tmc : 	d.tmc,
			time: 	get_time_from_timestamp(d.tstamp),
			speed:	parseFloat(d.speed)
		};
	}).then(function(data) {
		speed_data = data;
		
		// Now, generate the viz
		generate_viz();
	})
});
