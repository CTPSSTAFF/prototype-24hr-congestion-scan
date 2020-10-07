// csCommon.js - Library of common functions used in the congestion scan generator apps.
//
// Author: Ben Krepp
// Date: August, 2020
(function() {
    // Internals of the library (if any) go here
    //
	// Data value to indicate either:
	//     1. No speed data value present in input data
	//     2. Speed data value present in input data, but cvalue less than "default" minimum cvalue (i.e., 75.0).
	var _NO_DATA =	-9999;
	
	// *** Public API of the library begins here. ***
	return csCommon = {
		version : "1.0",
		// Data value to indicate either:
		//     1. No speed data value present in input data
		//     2. Speed data value present in input data, but cvalue less than "default" minimum cvalue (i.e., 75.0).
		NO_DATA :	_NO_DATA,
		
		// Minium cvalue of data records used to generate visualization.
		// By default, this value is 75.0, the minimum cvalue of data records used in CMP analyses.
		// Un-checking the "restrict_cvalue" checkbox will cause records with ANY cvalue > 0.0 to be used in the viz.
		//
		DEFAULT_CVALUE :	 75.0,

		// Threshold scale for speed data
		speed_scale : d3.scaleThreshold()
							.domain([0, 10, 20, 30, 40, 50, Infinity])
							.range(['gray', '#cc1414', '#ff4719', '#ffa319', '#ffe019', '#affc19', '#32fa32']),
							
		speed_legend_labels : ['No Data', '< 10 MPH', '10-20 MPH', '20-30 MPH', '30-40 MPH', '40-50 MPH', '> 50 MPH'],
		
		// Threshold scale for computed speed index
		// This is the same scale as used in the CMP express dashboard for speed index, 
		// augmented with domain and range values for 'No Data'
		speed_index_scale : d3.scaleThreshold()
									.domain([0, 0.400, 0.500, 0.700, 0.900, Infinity])
									.range([ "gray", 
											"rgba(230, 0, 169,0.9)", "rgba(169, 0, 230,0.9)", "rgba(0, 112, 255,0.9)", 
											"rgba(115, 178, 255,0.9)", "rgba(190, 210, 255,0.9)"]),

		speed_index_legend_labels : ['No Data', '< 0.4', '0.5', '0.7', '0.9', '> 0.9'],
		
		// Threshold scale for delta-of-speed values
		delta_speed_scale	:	d3.scaleThreshold()
									.domain([-9998, -20, -10, -5, 0, 5, 10, Infinity])
									.range([ 'gray', 
											 '#cb181d', '#fb6a4a', '#fcae91', '#fee5d9',
											 '#edf8e9', '#bae4b3', '#74c476', '#238b45' ]),

		delta_speed_legend_labels	: [ 'No Data', '< -20', '-10', '-5', '0', '5', '10', '20', '> 20' ],
		
		// get_speed - Function to 'safely' parse and return speed value.
		//
		// Speed data and/or a cvalue may be missing in some records.
		// When this is the case record this explicitly with the NO_DATA value,
		// so scale and legend functions can work w/o requiring hacks.
		// We also do not use records with a cvalue less than 75.0, setting
		// their value to NO_DATA for purposes of generating the visualization.
		//
		get_speed	: function(d, min_cvalue) {
							// var temp_str = 'Entering get_speed. TMC = ' + d.tmc;
							var retval, speed, cvalue;
							speed = parseFloat(d.speed);
							cvalue = parseFloat(d.cvalue);
							if (isNaN(speed) || isNaN(cvalue) || cvalue < min_cvalue) {
								retval = _NO_DATA;
								// console.log('Mapping ' + temp + ' to NO_DATA.');
							} else {
								retval = speed;
							}
							// console.log(temp_str + ' retval = ' + retval);
							return retval;
					},	// get_speed()
		
		// #2 - Function to 'safely' parse speed and spd_limit values, 
		//      and compute and return speed index.
		// See comments on preceeding function.
		//
		get_speed_index : function(d, min_cvalue) {
							var retval, speed, cvalue, tmc_rec, spd_limit;
							speed = parseFloat(d.speed);
							cvalue = parseFloat(d.cvalue);
							if (isNaN(speed) || isNaN(cvalue) || cvalue < min_cvalue) {
								retval = _NO_DATA;
							} else {
								tmc_rec = _.find(tmc_data, function(rec) { return rec.tmc == d.tmc; });
								spd_limit = tmc_rec['spd_limit'];
								temp = speed / spd_limit;
								retval = temp;
							}
							return retval;
						},

		// get_time_from_timestamp: Parse an INRIX timestamp, and return object with 'hr' and 'min' properties
		// Format of INRIX timestamp is yyyy-mm-dd hh:mm:ss
		// Note: space between 'dd' and 'mm'.
		// Return object with hour and minute, both as integers.
		//
		get_time_from_timestamp	:	function(tstamp) {
										var hms, hr, min;
										hms = tstamp.split(' ')[1].split(':');
										hr = +hms[0];
										min = +hms[1];
										return { 'hr' : hr, 'min' : min };
									}, // get_time_from_timestamp()
		// 
		// format_time: function to format 'time' values in data bound to SVG elements for on-hover output
		// 
		format_time				:	function(time) {
										var hour, minute, suffix, retval;
										suffix = (time['hr'] < 12) ? 'a.m.' : 'p.m.';
										hour = (time['hr'] <= 12) ? time['hr'] : time['hr'] - 12;
										hour = (hour === 0) ? 12 : hour;
										minute = (time['min'] < 10) ? '0' + time['min'] : time['min'];
										retval = hour + ':' + minute + ' ' + suffix;
										return retval;
									},	// format_time()
									
		//
		// usDateStrToAppDateStr:  function to convert a "US-style" date string into a "yyyy-mm-dd" format date string,
		//                         the date format used internally by this app, and return it.
		//
		// Note the following about the datepicker format 'MM d, yy':
		//     MM - full text of name of month, e.g., "January"
		//     d  - day of month, with NO leading zeros
		//     yy - four digit (yes, FOUR-digit) year
		// ==> There is EXACTLY one space between the month name and the day-of-month.
		// ==> There is EXACTLY one space between the comma (',') and the year
		//
		usDateStrToAppDateStr	:	function(usDateStr) {
										var retval, parts, moStr, dayStr, yrStr, outMo, outDay, outYr;
										var months = {  'January'   : '01',
														'February'  : '02',
														'March'     : '03',
														'April'     : '04',
														'May'       : '05',
														'June'      : '06',
														'July'      : '07',
														'August'    : '08',
														'September' : '09',
														'October'   : '10',
														'November'  : '11',
														'December'  : '12'
										}; 
										
										retval = '';
										parts = usDateStr.split(' ');
										moStr = parts[0];
										dayStr = parts[1].replace(',','');
										yrStr = parts[2];
										outYr = yrStr;
										outMo = months[moStr];
										outDay = (+dayStr < 10) ? '0' + dayStr : dayStr;
										retval = outYr + '-' + outMo + '-' + outDay;
										return retval;
									},	// usDateStrToAppDateStr()
		
		//							
		// jsDateObjToAppDateStr: function to convert a JavaScript "Date" object into a "yyyy-mm-dd" 
		// format date string, the date format used internally by this app, and return it.
		//
		jsDateObjToAppDateStr	:	function(jsDate) {
										var year, month, dayOfMonth, appDateStr;
										year = jsDate.getFullYear();
										// Remember: JS Date object months are ZERO indexed!
										month = jsDate.getMonth() + 1;
										month = (month < 10) ? "0" + month : month;
										dayOfMonth = jsDate.getDate();
										dayOfMonth = (dayOfMonth < 10) ? "0" + dayOfMonth : dayOfMonth;
										appDateStr = year + '-' + month + '-' + dayOfMonth;
										return appDateStr;
									} // jsDateObjToAppDateStr()
	}
})();