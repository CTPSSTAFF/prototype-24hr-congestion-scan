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
		//
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
		// format: function to format 'time' values in data bound to SVG elements for on-hover output
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
	};
})();