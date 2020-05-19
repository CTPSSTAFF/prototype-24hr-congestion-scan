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

// Color scale for speed data
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


// ********************** THE FOLLOWING ROUTINE IS A FOSSIL *************************
//
// Function: initialize_for_route
//
// Parameter: route - name of route in <route_system><route_number>_<route_direction> format, 
//            e.g., 'i93_nb'
// Side effects: updates global variables  'current_route', 'tmc_data', and 'num_tmcs'
//
// Summary: load TMC data for specified route, and generate TMC labels in RHS of viz
function initialize_for_route(route) {
	// Cache current_route; needed in initialize_for_date when opening speed data file
	current_route = route;
	
	var csv_fn = "data/tmc/" + route + "_tmcs.csv";
	d3.csv(csv_fn, function(d) {
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
		
		// Reset the height of the SVG element to reflect the number of TMCS in the route
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

	});
} // initialize_for_route()

// ********************** THE FOLLOWING ROUTINE IS A FOSSIL *************************
//
// Function: initialize_for_date
//
// Parameter: date - date in <yyyy>-<mm>-<dd> format, e.g., '2020-03-13'
// Side effects: updates global variable 'speed_data'
//
// Summary: load speed data for specified date, and generate speed viz in LHS of viz
function initialize_for_date(date) {
	var csv_fn = "data/speed/" + current_route + "_" + date + ".csv";
	
	d3.csv(csv_fn, function(d) {
		return {
			tmc : 	d.tmc,
			time: 	get_time_from_timestamp(d.tstamp),
			speed:	parseFloat(d.speed)
			};
		}).then(function(data) {
			speed_data = data;
			
			// The "background" rect has been introduced to deal with cases in which
			// the data retreived from RITIS doesn't merely have records with NULL speed
			// data values, but actually may be MISSING records for some time periods entirely.
			// Yeech! 05/15/2020
			
			if ($('#viz_div #background').length === 0) {
				var background_g = svg.append("g")
					.attr("id", "background")
					.attr("transform", "translate(" + left_margin + "," + top_margin + ")")
					.append("rect")
						.attr("class", "background")
						.attr("x", 0)
						.attr("y", 0)
						.attr("width", w)
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
							// console.log('x = ' + tmp +  '    time: hour = ' + hr + ' min = ' + min);
							return tmp;
						})
					.attr("y", function(d,i) { 
								var tmc_rec = _.find(tmc_data, function(rec) { return rec.tmc == d.tmc; });
								//
								// console.log('tmc: ' + d.tmc + ' seq_num = ' + tmc_rec['seq_num']);
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
	});
} // initialize_for_date()

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
				speed:	parseFloat(d.speed)
				};
			}).then(function(data) {
				speed_data = data;
				
				// The "background" rect has been introduced to deal with cases in which
				// the data retreived from RITIS doesn't merely have records with NULL speed
				// data values, but actually may be MISSING records for some time periods entirely.
				// Yeech! 05/15/2020
				
				if ($('#viz_div #background').length === 0) {
					var background_g = svg.append("g")
						.attr("id", "background")
						.attr("transform", "translate(" + left_margin + "," + top_margin + ")")
						.append("rect")
							.attr("class", "background")
							.attr("x", 0)
							.attr("y", 0)
							.attr("width", w)
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
								// console.log('x = ' + tmp +  '    time: hour = ' + hr + ' min = ' + min);
								return tmp;
							})
						.attr("y", function(d,i) { 
									var tmc_rec = _.find(tmc_data, function(rec) { return rec.tmc == d.tmc; });
									//
									// console.log('tmc: ' + d.tmc + ' seq_num = ' + tmc_rec['seq_num']);
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
		
		// Generate SVG framework and (invariant) X-axis
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
		
		// And kick things off with the viz for I-93 NB on 8 March, 2020:
		generate_viz('i93_nb', '2020-03-08');
	});
	
} // initialize()

initialize();
