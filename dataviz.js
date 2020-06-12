// Prototype application to visualize congestion data (i.e., generate 'congestion scans')
// for a specified set of express highways in the Boston MPO region for a specified 
// list of dates, using INRIX speed / travel-time data downloaded from RITIS.
// The application generates a visualization for the route and date selected by the user.
// The routes and dates are specified in the configuration file 'config.json'.
//
// Author: Ben Krepp

// Data stores for TMC and speed data read in
var tmc_data = [],
    speed_data = [];
var current_route = '',
    current_date = '';
	
// Placholder value - populated with actual number of TMCs for route by initialize_for_route
var num_tmcs = 100;

// Globals used to generate the data viz
// SVG object containing entire viz
var svg; 
var cell_w = 10,
    cell_h = 10;
var recs_per_hour = 6;
var num_time_recs = recs_per_hour * 24;
var minutes_per_rec = 10;

var left_margin = 170,
    top_margin = 20,
	top_margin_for_x_axis = 19,
	top_margin_for_labels = 25;
var w = left_margin + (cell_w * num_time_recs),
    h = top_margin + (cell_h * num_tmcs);

// Time scale for x-axis
// Use 24 hours beginning January 1, 1900 as reference point
var timeScale = d3.scaleTime()
					.domain([new Date(1900, 0, 1, 0, 0), new Date(1900, 0, 1, 23, 50)])
					.range([0, cell_w * num_time_recs]);
// X-axis - see comment in code below labeled "NOTE"
var xAxis = d3.axisTop()
				.scale(timeScale)
				.ticks(24)
				.tickFormat(d3.timeFormat("%I %p"));
				
// Basic threshold scale for speed data
var basic_speed_scale = d3.scaleThreshold()
							.domain([0, 10, 20, 30, 40, 50, Infinity])
							.range(['gray', '#cc1414', '#ff4719', '#ffa319', '#ffe019', '#affc19', '#32fa32']); 
							
// Legend labels 
var legend_labels = ['No Data', '< 10 MPH', '10-20 MPH', '20-30 MPH', '30-40 MPH', '40-50 MPH', '> 50 MPH'];


// Utility functions used when parsing timestamp and speed data
//
// Format of INRIX timestamp is yyyy-mm-dd hh:mm:ss
// Note: space between 'dd' and 'mm'.
// Return object with hour and minute, both as integers.
//
function get_time_from_timestamp(tstamp) {
	var hms, hr, min;
	hms = tstamp.split(' ')[1].split(':');
	hr = +hms[0];
	min = +hms[1];
	return { 'hr' : hr, 'min' : min };
}

var NO_DATA = -9999;

// Speed data may be missing in some records;
// When this is the case record this explicitly with the NO_DATA value,
// so scale and legend functions can work w/o requiring hacks.
//
function get_speed(d) {
	var temp = parseFloat(d.speed);
	if (isNaN(temp)) {
		temp = NO_DATA;
	}
	return temp;
} 

// Utility function to format 'time' values for on-hover output
//
function format_time(time) {
	var hour, minute, suffix, retval;
	suffix = (time['hr'] < 12) ? 'a.m.' : 'p.m.';
	hour = (time['hr'] <= 12) ? time['hr'] : time['hr'] - 12;
	hour = (hour === 0) ? 12 : hour;
	minute = (time['min'] < 10) ? '0' + time['min'] : time['min'];
	retval = hour + ':' + minute + ' ' + suffix;
	return retval;
}

function generate_viz(route, date) {
	current_route = route;
	var tmc_csv_fn = "data/tmc/" + route + "_tmcs.csv";
	d3.csv(tmc_csv_fn, function(d) {
	return {
		tmc : 		d.tmc,
		seq_num:	+d.seq_num,
		from_meas:	parseFloat(d.from_meas),
		distance:	parseFloat(d.distance),
		firstnm:	d.firstnm,
		seg_begin:	d.seg_begin,
		seg_end:	d.seg_end,
		spd_limit:	+d.spd_limit
	};
	}).then(function(data) {
		tmc_data = data;
		num_tmcs = tmc_data.length;
		
		// Set the height of the SVG element to reflect the number of TMCS in the route
		var newHeight = top_margin + (cell_h * num_tmcs)
		var domElt = $('#viz_svg')[0];
		domElt.setAttribute("height", newHeight);
		
		// Remove group containing the labels for the previous route, if there was one.
		if ($('#viz_div #labels').length > 0) {
			$('#viz_div #labels').remove();
		}
		
		var label_g = svg.append("g")
					.attr("id", "labels")
					.attr("transform", "translate(0," + top_margin_for_labels + ")");

		label_g.selectAll("text.tmc_label")
			.data(tmc_data)
			.enter()
				.append("text")
					.attr("class", "tmc_label")
					.attr("x", 0)
					.attr("y", function(d, i) { return d.seq_num * cell_h; })
					.attr("height", cell_h)
					.attr("text-anchor", "start")
					.attr("font-size", 10)
					.text(function(d, i) { return d.firstnm; });
					
		var speed_csv_fn = "data/speed/" + current_route + "_" + date + ".csv";
	
		d3.csv(speed_csv_fn, function(d) {
			return {
				tmc : 	d.tmc,
				time: 	get_time_from_timestamp(d.tstamp),
				speed:	get_speed(d)
				};
			}).then(function(data) {
				speed_data = data;
				
				// There are no data records for the time period between 0200 and 0300 
				// on the day on which daylight savings time begins: 8 March 2020.
				if ((date === '2020-03-08') && $('#viz_div #dst_filler').length === 0) {
					var background_g = svg.append("g")
						.attr("id", "dst_filler")
						.attr("transform", "translate(" + left_margin + "," + top_margin + ")")
						.append("rect")
							.attr("class", "dst_filler")
							.attr("x", recs_per_hour*2*cell_w)
							.attr("y", 0)
							.attr("width", recs_per_hour*cell_w)
							.attr("height", top_margin + (cell_h * num_tmcs))
							.attr("fill", "#e6e6e6");
				}
				
				// Remove group containing the speed grid for the previous day, if there was one.
				if ($('#viz_div #grid').length > 0) {
					$('#viz_div #grid').remove();
				}
				// Grid in which the speed data for the new day is displayed
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
						.attr("fill", function(d,i){ return basic_speed_scale(get_speed(d)); })
					// The following is temporary, for use during development
					.append("title")
						.text(function(d,i) { 
								var tmp; 
								tmp = 'tmc: ' + d.tmc + '\n';
								tmp += format_time(d.time) + '\n';
								tmp += 'speed: ';
								tmp +=  (d.speed !== NO_DATA) ? d.speed + ' MPH' : 'NO DATA';
								return tmp; 
							});
		});
	});
} // generate_viz()

// Function: initialize
// Summary: read configuration file, populate select boxes and define event handers for them,
//          generate SVG framework, and X-axis
function initialize() {
	d3.json("config.json").then(function(config) {
		// Populate the <select> box for route
        var i, oSelect, oOption;
        oSelect = document.getElementById("select_route");
        for (i = 0; i < config.routes.length; i++) {
            oOption = document.createElement("OPTION");
            oOption.value = config.routes[i].value;
            oOption.text = config.routes[i].text;
			if (config.routes[i].selected === true) {
					oOption.selected = true;
			}
            oSelect.options.add(oOption); 
        }
		// Populate the <select> box for date
        oSelect = document.getElementById("select_date");
        for (i = 0; i < config.dates.length; i++) {
            oOption = document.createElement("OPTION");
            oOption.value = config.dates[i].value;
            oOption.text = config.dates[i].text;
			if (config.dates[i].selected === true) {
					oOption.selected = true;
			}
			oSelect.options.add(oOption);
        }
		
		// Define event handlers for select boxes
		$('#select_route').change(function(e) {
			var route, date;
			route = $("#select_route option:selected").attr('value');
			current_route = route;
			date = $("#select_date option:selected").attr('value');
			current_date = date;
			generate_viz(route, date);
		});
		
		$('#select_date').change( function(e) {
			var route, date;
			route = $("#select_route option:selected").attr('value');
			current_route = route;
			date = $("#select_date option:selected").attr('value');
			current_date = date;
			generate_viz(route, date);
		});
		
		// Generate SVG legend
		svg_leg = d3.select('#legend_div')
			.append("svg")
			.attr("id", "legend_svg")
			.attr("height", 70)
			.attr("width", 1000);
			
		svg_leg.append("g")
			.attr("class", "legendQuant")
			.attr("transform", "translate(170,20)");
			
		var legend = d3.legendColor()
			.labelFormat(d3.format(".0f"))
			.labels(legend_labels)
			.shapeWidth(100)
			.orient('horizontal')
			.scale(basic_speed_scale);
			
		svg_leg.select(".legendQuant")
			.call(legend);
		
		// Generate the framework for the main SVG visualization, including the (invariant) X-axis
		svg = d3.select("#viz_div")
			.append("svg")
			.attr("id", "viz_svg")
			.attr("width", w)
			.attr("height", h);

		svg.append("g")
			.attr("class", "axis")
			.call(xAxis)
			.attr("transform", "translate(" + left_margin + "," + top_margin_for_x_axis + ")");
		// NOTE:
		// The following grotesque - and hardly robust - hack is a work-around for d3.formatTime() 
		// not supporting rendering hour values between 1 and 9 *without* a leading zero.
		// C'mon, Mike - this would be an easy one to implement on your end, wouldn't it?
		var xTickLabels = $('.axis text');
		var i,curText, newText;
		for (i = 0; i < xTickLabels.length; i++) {
			curText = $(xTickLabels[i]).html();
			if (curText[0] === '0') {
				newText = curText.replace('0', ' ');
				$(xTickLabels[i]).html(newText);
			}
		}
		
		// And kick things off with the viz for I-93 NB on 13 March, 2020:
		generate_viz('i93_nb', '2020-03-13');
	});
	
} // initialize()

initialize();
