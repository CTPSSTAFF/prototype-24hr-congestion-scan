// Prototype application to generate an _animated_ day-by-day visualization of congestion
// on a selected express highway in the Boston MPO region for all days between a user-specified
// start- and end-date.
// The available routes and dates are specified in the configuration file 'config.json'.
//
// Author: Ben Krepp

// Configuration data read in
var config_data = [];

// Data stores for TMC and speed data read in
var tmc_data = [],
    speed_data = [];
var current_route = 'i93_nb',
    current_date = '',
	start_date = '2020-01-01';
	end_date = '2020-08-31',
	default_start_date = '2020-03-01',
	default_end_date = '2020-06-30';

// Placholder value - populated with actual number of TMCs for route by initialize_for_route
var num_tmcs = 100;

// Globals used to generate the data viz
// SVG object containing entire viz
var svg;
// SVG <g> object containing grid of symbolized <rect>s for speed or speed index 
var grid_g;
// SVG group for <text> elements to label TMCs
var label_g;

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

// Time scale for X-axis
// Use 24 hours beginning January 1, 1900 as reference point
var timeScale =	 d3.scaleTime()
					.domain([new Date(1900, 0, 1, 0, 0), new Date(1900, 0, 1, 23, 50)])
					.range([0, cell_w * num_time_recs]);
					
// X-axis - see comment in code below labeled "NOTE"
var xAxis = d3.axisTop()
				.scale(timeScale)
				.ticks(24)
				.tickFormat(d3.timeFormat("%I %p"));

// Display mode: 'speed' or 'speed_index'.
//
var display_mode = 'speed'; 

// Minium cvalue of data records used to generate visualization.
//
var min_cvalue = csCommon.DEFAULT_CVALUE;

// Timer(s) to be stopped when new route is selected.
var timer_ids = [];

// One new frame of visualization is rendered every 3000 milliseconds (3 seconds).
var FRAME_INTERVAL = 3000;

// Utility function which, given an INIRX format date (yyyy-mm-dd) string, 
// returns a US-style date string
//
function make_date_text(date) {
	var parts = date.split('-');
	var year = parts[0]
	var month_num = parseInt(parts[1],10);
	var day = parseInt(parts[2],10);
	var months = ['January', 'February', 'March', 'April', 'May', 'June',
	              'July', 'August', 'September', 'October', 'November', 'December'];
	var month = months[month_num-1]; // Recall 0-based array indexing
	return month + ' ' + day + ', ' + year;
}


// Function: get_and_render_data_for_date
//
// Read and render the data for the currently selected route for one day
// Parameter 'date_ix' is an index into the array of dates in the config object;
// it indicates which day's worth of data is to be rendered.
//
// Note that when the selected route changes, init_viz_for_route is called;
// this sets up the visualization framework for the new route. Once this
// has been completed, get_and_render_data_for_date is called for each
// day's worth of data to be rendered.
//
function get_and_render_data_for_date(route, date_ix, end_date_ix) {
	if (route !== current_route) return;
	var date, speed_csv_fn;
	date = config_data['dates'][date_ix].value;
	speed_csv_fn = "data/speed/" + current_route + "/" + current_route + "_" + date + ".csv";
	// console.log('Initiating load of ' + speed_csv_fn);
	d3.csv(speed_csv_fn, function(d) {
	return {
		tmc : 	d.tmc,
		time: 	csCommon.get_time_from_timestamp(d.tstamp),
		speed:	csCommon.get_speed(d, min_cvalue),
		cvalue:	(d.cvalue == null) ? csCommon.NO_DATA : +d.cvalue	// Yes, sometimes the cvalue field is empty... :-(
		};
	}).then(function(data) {
		if (route !== current_route) return;
		// console.log('Rendering data for ' + speed_csv_fn);
		var date_text = make_date_text(date);
		$('#app_caption_specific_date').html(date_text);
		
		// Set legend according to display mode
		if (display_mode === 'speed') {
			$('#speed_index_legend_div').hide();
			$('#speed_legend_div').show();
		} else {
			// display_mode === 'speed_index'
			$('#speed_legend_div').hide();
			$('#speed_index_legend_div').show();
		}
		
		// Grotesque work-around for INRIX data outage on 29-31 March 2020:
		if (date === '2020-03-29' || date === '2020-03-30' || date === '2020-03-31') {
			if ($('#viz_div #data_outage').length === 0) {
				var outage_g = svg.append("g")
					.attr("id", "data_outage")
					.attr("transform", "translate(" + left_margin + "," + top_margin + ")")
					.append("rect")
						.attr("class", "data_outage")
						.attr("x", 0)
						.attr("y", 0)
						.attr("width", num_time_recs*cell_w)
						.attr("height", top_margin + (cell_h * num_tmcs))
						.attr("fill", "gray");
			}
			// Once we've inserted this 24-hour hack, there's nothing more to do: return.
			return;
		} else if ($('#viz_div #data_outage').length > 0) {
			// Date is not 29-31 March 2020; if #data_outage hack is present, remove it
			$('#viz_div #data_outage').remove();
		}
		
		// Get on with the business of rendering real data.
		grid_g.selectAll("rect.cell").data(data).enter();
		// Deal with special case of daylight savings time change on 03/08/2020
		// There are no data records for the time period between 0200 and 0300 
		// on the day on which daylight savings time begins: 8 March 2020.
		if (date === '2020-03-08') {
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
		} else if ($('#viz_div #dst_filler').length > 0) {
			$('#dst_filler').remove();
		}
		grid_g.selectAll("rect.cell").transition().duration(1500)
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
			.attr("fill", function(d,i) { 
							var tmp, retval;
							if (display_mode === 'speed') {
								tmp = csCommon.get_speed(d, min_cvalue);
								retval = csCommon.speed_scale(tmp);
							} else {
								// display_mode === 'speed_index'
								tmp = csCommon.get_speed_index(d, min_cvalue);
								retval = csCommon.speed_index_scale(tmp); 
							}
							return retval;
						});
	}).then(function() {
		var tid = setTimeout(
					function() {
						// TRACE
						console.log('Number of <rect> elements: ' + $('rect').length);
						
						if (date_ix < end_date_ix) {
							get_and_render_data_for_date(current_route, date_ix+1, end_date_ix);
						} else {
							// Animated visualization is done: notify user and reset start/stop buttons
							$('#alert_dialog_content').html('Animated visualization completed.');
							$(function() {
								$('#alert_dialog').dialog({ 
									dialogClass: "alert",
									modal: true,
									buttons: {
										OK: function() {
											$(this).dialog("close");
										}
									}
								});
							});
							$('#stop_button')[0].disabled = true;
							$('#stop_button').hide();
							$('#start_button')[0].disabled = false;
							$('#start_button').show();
							$('#app_caption_specific').hide();
						}
					}, 
					FRAME_INTERVAL);
				timer_ids.push(tid);
	});
} //get_and_render_data_for_date()

// Function: init_viz_for_route
//
// 1. Reads and parses the CSV file containing information about the TMCs for the route
// 2. sets up SVG <text> elements to label the TMCs in the left-hand 'pane'
// 3. Reads and parses the CSV file containing the first day's worth of speed/travel-time
//    data for the route
// 4. Generates a "grid" of SVG <rect>s for the set of {TMC, 10-minute-time-slot} pairs;
//    these are given a "fill" attribute of "none" here, and are populated with a fill
//    representing the relevant speed or speed_limit in get_and_render_data_for_date.
//
function init_viz_for_route(route) {
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
		
		label_g = svg.append("g")
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
					
		var first_date = config_data.dates[0].value;
		var speed_csv_fn = "data/speed/" + current_route + "/" + current_route + "_" + first_date + ".csv";
		
		d3.csv(speed_csv_fn, function(d) {
			return {
				tmc : 	d.tmc,
				time: 	csCommon.get_time_from_timestamp(d.tstamp),
				speed:	csCommon.get_speed(d, min_cvalue),
				cvalue:	(d.cvalue == null) ? csCommon.NO_DATA : +d.cvalue	// Yes, sometimes the cvalue field is empty... :-(
				};
			}).then(function(data) {
				var first_speed_data = data;

			// Grid in which the speed data for a given day is displayed
			grid_g = svg.append("g")
				.attr("id", "grid")
				.attr("transform", "translate(" + left_margin + "," + top_margin + ")");
					// Create a blank grid
					grid_g.selectAll("rect.cell")
						.data(first_speed_data)
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
							// "Blank canvas" symbolization to start
							.attr("fill", "#ffffff")
						// The following is temporary, for use during development
						.append("title")
							.text(function(d,i) { 
									var tmp; 
									tmp = 'tmc: ' + d.tmc + '\n';
									tmp += csCommon.format_time(d.time) + '\n';
									tmp += 'speed: ';
									tmp +=  (d.speed !== csCommon.NO_DATA) ? d.speed + ' MPH' : 'NO DATA';
									return tmp; 
								});
			$('#app_caption_specific').show();
		});
	});
} // init_viz_for_route()

// Function: initialize
// Summary: 
//	1. Read configuration file
//  2. Populate select box for route, and define on-change event handler for it
//  3. Generate "invariant" parts of SVG framework, e.g., X-axis (time axis)
//  4. Call init_viz_for_route and get_and_render_data_for_date to 
//     kick off the animated visualization
//
function initialize() {
	d3.json("config.json").then(function(config) {
		config_data = config;
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

		// Configure datepicker controls (replacement for select_date combo box).
		// Note: The "month" in JS a Date object is zero-indexed.
		$('.datepicker').datepicker({ dateFormat: 'MM d, yy' });
		$('.datepicker').datepicker({ showOn: "focus" });
		var minDate = config.dates[0].text,
		    maxDate = config.dates[config.dates.length-1].text;

		$('#datepicker_start').datepicker("option", "minDate", minDate);
		$('#datepicker_start').datepicker("option", "maxDate", config.dates[config.dates.length-2].text);
		var default_start_ix = _.findIndex(config.dates, function(rec) { return rec.value === default_start_date; });
		$('#datepicker_start').datepicker("option", "defaultDate", config.dates[default_start_ix].text);
		$('#datepicker_start').datepicker( "setDate", config.dates[default_start_ix].text);
		start_date = default_start_date;

		$('#datepicker_end').datepicker("option", "minDate", config.dates[1].text);
		$('#datepicker_end').datepicker("option", "maxDate", maxDate);
		var default_end_ix = _.findIndex(config.dates, function(rec) { return rec.value === default_end_date; });
		$('#datepicker_end').datepicker("option", "defaultDate", config.dates[default_end_ix].text);
		$('#datepicker_end').datepicker( "setDate", config.dates[default_end_ix].text);
		end_date = default_end_date;
		
		$('.datepicker').datepicker("option", "onClose", 
			function(dateText, instance) {
				var date;
				if (dateText === "") return;
				date  = csCommon.usDateStrToAppDateStr(dateText);
				if (instance.id === 'datepicker_start') {
					start_date = date;
				} else {
					end_date = date;
				}
		});

		// Define on-change event handler for select box
		$('#select_route').change(function(e) {
			current_route = $("#select_route option:selected").attr('value');
		});
		current_route = 'i93_nb';
		
		// Define on-change event handler for "display mode" radio buttons.
		// Note that this merely caches the newly specified display mode;
		// the change is not reflected until the next day's worth of data
		// is read in and rendered.
		$('.mode').change(function(e) {
			display_mode = $("input[name='mode']:checked").val();
		});
		
		// Define on-change event handler for "restrict_cvalue" checkbox.
		// Note that this merely caches the new minimum cvalue;
		// the change is not reflected until the next day's worth
		// of data is read in and rendered.
		$('#restrict_cvalue').change(function(e) {
			if (e.target.checked === true) {
				min_cvalue = csCommon.DEFAULT_CVALUE;
			} else {
				min_cvalue = 0.0;
			}
		});
		
		
		// Define on-click event handler for "start" button
		$('#start_button').click(function(e) {
			// Check that end_date is > than start_date
			var start_date_ix = _.findIndex(config_data.dates, function(rec) { return rec.value === start_date; }),
			    end_date_ix   = _.findIndex(config_data.dates, function(rec) { return rec.value === end_date; });
			if (end_date_ix < start_date_ix) {
				var msg = 'End date (' + end_date + ') is earlier than start date (' + start_date + ').';
				alert(msg);
				return;
			}
			init_viz_for_route(current_route);
			var tid  = setTimeout(function() { get_and_render_data_for_date(current_route, start_date_ix, end_date_ix); }, 500);
			timer_ids.push(tid);
			// Disable and hide start button; enable and show stop button
			this.disabled = true;
			$('#start_button').hide();
			$('#stop_button')[0].disabled = false;
			$('#stop_button').show();
		});
		
		// Define on-click event handler for "stop" button
		$('#stop_button').click(function(e) {
			// Kill any/all pending timers 
			var tmp;
			while (timer_ids.length > 0) {
				tmp = timer_ids.pop();
				clearTimeout(tmp);
			}
			// Disable and hide stop button; enable and show start button
			this.disabled = true;
			$('#stop_button').hide();
			$('#start_button')[0].disabled = false;
			$('#start_button').show();
		});
		


		// Generate SVG legends for speed and speed index,
		// and hide the one for speed index at init time.
		var svg_leg_speed  = d3.select('#speed_legend_div')
			.append("svg")
			.attr("id", "legend_svg")
			.attr("height", 70)
			.attr("width", 1000);
		svg_leg_speed.append("g")
			.attr("class", "legendQuant")
			.attr("transform", "translate(170,20)");
		var speed_legend = d3.legendColor()
			.labelFormat(d3.format(".0f"))
			.labels(csCommon.speed_legend_labels)
			.shapeWidth(100)
			.orient('horizontal')
			.scale(csCommon.speed_scale);
		svg_leg_speed.select(".legendQuant")
			.call(speed_legend);
			
		var svg_leg_speed_index = d3.select('#speed_index_legend_div')
			.append("svg")
			.attr("id", "speed_ix_legend_svg")
			.attr("height", 70)
			.attr("width", 1000);
		svg_leg_speed_index.append("g")
			.attr("class", "legendQuant")
			.attr("transform", "translate(170,20)");
		var speed_index_legend = d3.legendColor()
			.labelFormat(d3.format(".0f"))
			.labels(csCommon.speed_index_legend_labels)
			.shapeWidth(100)
			.orient('horizontal')
			.scale(csCommon.speed_index_scale);
		svg_leg_speed_index.select(".legendQuant")
			.call(speed_index_legend);
			
		$('#speed_index_legend_div').hide();

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
	});
} // initialize()

initialize();
