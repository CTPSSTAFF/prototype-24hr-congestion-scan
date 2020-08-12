// csCommon.js - Library of common functions used in the congestion scan generator apps.
//
// Author: Ben Krepp
// Date: August, 2020
(function() {
    // Internals of the library (if any) go here
    //
	// *** Public API of the library begins here. ***
	return csCommon = {
		version : "1.0",
		// Data value to indicate either:
		//     1. No speed data value present in input data
		//     2. Speed data value present in input data, but cvalue less than "default" minimum cvalue (i.e., 75.0).
		NO_DATA :	-9999,
		
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
									.domain([0.400, 0.500, 0.700, 0.900, Infinity])
									.range([ "gray", 
											"rgba(230, 0, 169,0.9)", "rgba(169, 0, 230,0.9)", "rgba(0, 112, 255,0.9)", 
											"rgba(115, 178, 255,0.9)", "rgba(190, 210, 255,0.9)"]),

		speed_index_legend_labels : ['No Data', '0.4', '0.5', '0.7', '0.9', '>0.9'],
		
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
									} // format_time()
	}
})();