tmc_data = [];
speed_data = [];

var tmc_row_converter = function(d) {
	var FOO = 0;
	return {
		tmc : 		d.tmc,
		seq_num:	+d.seq_num,
		from_meas:	parseFloat(d.from_meas),
		distance:	parseFloat(d.distance),
		spd_limit:	+d.spd_limit
	};
};


d3.csv("data/i93_nb_tmcs.csv", function(d) {
	return {
		tmc : 		d.tmc,
		seq_num:	+d.seq_num,
		from_meas:	parseFloat(d.from_meas),
		distance:	parseFloat(d.distance),
		spd_limit:	+d.spd_limit
	};
}).then(function(data) {
	tmc_data = data;
});

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

d3.csv("data/i93_nb_2020-03-13.csv", function(d) {
	return {
		tmc : 	d.tmc,
		time: 	get_time_from_timestamp(d.tstamp),
		speed:	parseFloat(d.speed)
	};
}).then(function(data) {
	speed_data = data;
});

var cell_w = 10,
    cell_h = 10;
	
var recs_per_hour = 6;
var time_recs = recs_per_hour * 24;
var minutes_per_rec = 10;

// Placholder; should be filled in for real when TMC data is read.
var num_tmcs = 100;

var w = cell_w * time_recs,
    h = cell_h * num_tmcs;
	
var speed_scale = d3.scaleThreshold()
					.domain([10, 20, 30, 40, 50, Infinity])
					.range(['#cc1414', '#ff4719', '#ffa319', '#ffe019', '#affc19', '#32fa32']); 
	
function generate_viz() {
	var svg = d3.select("#viz_div")
				.append("svg")
				.attr("width", w)
				.attr("height", h);
		
	svg.selectAll("rect")
		.data(speed_data)
		.enter()
		.append("rect")
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
	.attr("fill", function(d,i){ 
				var retval, temp;
				temp = speed_scale(d.speed);
				// Tests for missing speed value in input data - scale function couldn't
				if (typeof temp === 'undefined') { 
					console.log('tmc = ' + d.tmc)
					console.log('hour = ' + d.time['hr']);
					console.log('minute = ' + d.time['min']);
					console.log('scale function returned: ' + temp);
					retval = "gray";
				} else {
					retval = temp;
				}
				return retval;
		})
} //  generate_viz()