# prototype-24hr-congestion-scan
Prototype congestion-scan generator using INRIX speed data as input. 

Congestion scans may be generated in either static or animated form:
* congestion_scan.html - Generate a 24-hour congestion scan for a specified route on a specified day
* congestion_over_time.html - Generate an animated series of 24-hour congestion scans for a specified route,
over a specified range of days for which data is available and has been donwnloaded and processed for use in this app.

The prototype currently supports generation of congestion scans for all days between
January 1, 2020 and March 31, 2021.  
But note:
* INRIX experienced a data outage between 28 March and 2 April, 2020. Consequently:
    * No data at all is available for 29, 30, and 31 March, 2020.
	* Data is only available for a few hours on 28 March, 1 April, and 2 April, 2020.
* There is no data for 2:00 a.m. to 3:00 a.m. on 8 March, 2020: this is the time at which
daylight savings time came into effect in 2020, and the clock "leapt forward" by 1 hour from 2:00 a.m. directly to 3:00 a.m.

The prototype currently supports generation of congestion scans for the following routes:
* I-90 EB and WB (entire route in MA)
* I-93 NB and SB (entire route in MA)
* I-95 NB and SB (entire route in MA)
* I-290 EB and WB (entire route in MA)
* I-495 NB and SB (entire rotue in MA)
* US-1 NB and SB between I-93 and Peabody
* US-3 NB and SB between I-95 and the New Hampshire state line
* US-44 EB and WB (express highway portion of the route)
* MA SR-2 EB and WB within the CTPS model region
* MA SR-3 NB and SB (express highway portion of the route south of I-95)
* MA SR-24 NB and SB (entire route in MA)
* MA SR-128 NB and SB (express highway portion of the route not coincident with I-95)
* MA SR-140 NB and SB (express highway portion of the route)
* MA SR-146 NB and SB (express highway portion of the route)
* MA SR-213 EB and WB
* The Lowell connector NB and SB (MA SR N087 NB and MA SR N482 SB)

Data source: [INRIX](https://inrix.com) speed and travel time data provided through [RITIS](https://ritis.org).   
The raw data downloaded from INRIX required some post-processing to transform it into a form readily usable 
by the visualization generator. The processing was done by the script speed_data_processing.py.
In keeping with CMP practice, we use only data records with __confidence scores__ of 30 and __c-values__ greater than or equal to 75:
* Only records with confidence scores of 30 were downloaded from RITIS. 
* RITIS does not support filtering the data on c-value before download. Consequently, this filtering is performed in the visualiation
generator itself. We chose to do this rather than filtering on c-value in speed_data_processing.py, in case there was interest
in visualizing data with different c-value limit(s).

The data files read by this application reside in the __data/tmc__ and __data/speed__ subdirectories.

The __data/tmc__ subdirectory contains one "TMC definition" file per route supported.
These files use the naming convention <MassDOT_route_id_in_lower_case>\_tmcs.csv, e.g., i90\_eb\_tmcs.csv.

The __data/speed_subdirectory__ contains one "speed data" file for the cross-product of all routes supported
and all dates supported. For example, for the route id "I90 NB" there is a "speed data" file for each day
between March 1, 2020 and December 20, 2020. These files use the 
naming convention <Mass_DOT_route_id_in_lower_case>\_yyyy-mm-dd, e.g., i90_eb_2020-03-01.csv.

This prototype depends upon the following external libraries:
* jQuery version 3.5.1
* lodash version 4.17.15
* d3 version 5.16.0
* d3-legend version 2.25.6 - See the [d3-legend website](https://d3-legend.susielu.com/)

## Colophon
Author: [Ben Krepp](mailto:bkrepp@ctps.org)  
Address: Central Transportation Planning Staff, Boston Region Metropolitan Planning Agency  
10 Park Plaza  
Suite 2150  
Boston, MA 02116  
United States
