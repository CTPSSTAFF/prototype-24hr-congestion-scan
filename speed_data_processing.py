# Script to process INRIX speed-run data downloaded from RITIS.
#
# Input: CSV file containing speed data for one 'route' for any number
#        of 24-hour periods (i.e., days)
#
# Intermediate output: CSV file that is a copy of the input CSV file,
#                      but only contains attributes of interest.
#                      The column names in the output CSV file are given shorter
#                      names for the sake of convenience: tmc, tstamp, speed, cvalue
#
# Final output: One CSV file containing the data for each 24-hour period
#               in the intermediate output. 
#               At least for the time being, it is the user's responsibility
#               to know, a priori, the list of dates in question.
#
# This script assumes that the downloaded data is organized in 10 minute units.
#
# Overall steps:
# 1. Extract only the attributes of interest from the raw data from RITIS.
#    These attributes are: tmc_code, measurement_tstamp, speed, and cvalue.
# 2. Extract one CSV file for each day's worth of data;
#    at least for now, the user is expected to know the list of dates
#
# The author acknowledges that this script was written quite hastily, 
# and consequently is a bit of a hack; it still may contain some 
# vestigial debug logic, to boot. C'est la vie.
#
# --Ben Krepp, attending metaphysician

import csv

# String containing names of fields in the generated CSV files.
# These are the "attributes of interest" with names slightly shortened
# from their form in the raw downloaded data from RITIS.
#
out_csv_header = 'tmc,tstamp,speed,cvalue\n'

##########################################################################
# Step 1 - Generate a CSV file with only the attributes of interest in it.

# Input and output filenames for Step 1
#
base = r's:/_congestion_data/granularity_10min/'

from_fns =  [ base + 'I90_EB_data/i90_eb.csv',
              base + 'I90_WB_data/i90_wb.csv',
              base + 'I93_NB_data/i93_nb.csv',
              base + 'I93_SB_data/i93_sb.csv',
              base + 'I95_NB_data/i95_nb.csv',
              base + 'I95_SB_data/i95_sb.csv',
              base + 'I290_EB_data/i290_eb.csv',
              base + 'I290_WB_data/i290_wb.csv',
              base + 'I495_NB_data/i495_nb.csv',
              base + 'I495_SB_data/i495_sb.csv', 
              base + 'US1_NB_data/us1_nb.csv',
              base + 'US1_SB_data/us1_sb.csv', 
              base + 'US3_NB_data/us3_nb.csv',
              base + 'US3_SB_data/us3_sb.csv',
              base + 'US44_EB_data/us44_eb.csv',
              base + 'US44_WB_data/us44_wb.csv',               
              base + 'SR2_EB_data/sr2_eb.csv',
              base + 'SR2_WB_data/sr2_wb.csv',
              base + 'SR3_NB_data/sr3_nb.csv',
              base + 'SR3_SB_data/sr3_sb.csv',                          
              base + 'SR24_NB_data/sr24_nb.csv',
              base + 'SR24_SB_data/sr24_sb.csv',
              base + 'SR128_NB_data/sr128_nb.csv',
              base + 'SR128_SB_data/sr128_sb.csv',
              base + 'SR140_NB_data/sr140_nb.csv',
              base + 'SR140_SB_data/sr140_sb.csv',  
              base + 'SR146_NB_data/sr146_nb.csv',
              base + 'SR146_SB_data/sr146_sb.csv',              
              base + 'SR213_EB_data/sr213_eb.csv',
              base + 'SR213_WB_data/sr213_wb.csv',                           
              base + 'N087_NB_data/n087_nb.csv',
              base + 'N482_SB_data/n482_sb.csv' ]         
              
to_fns = [ fn.replace('.csv', '_p1.csv') for fn in from_fns] 


# Definition of function implementing Step 1:
# Generate a CSV file with only the attributes of interest in it
#
# Function to read the raw CSV file generated by RITIS,
# and produce an output CSV file containing all the input records,
# but only with the "attributes of interest" in each row.
#
def extract_csv_with_subset_attrs(in_fname, out_fname):
    s = 'Extracting from ' + in_fname + '\n' + '           to ' + out_fname
    print(s)
    global csv_header
    out_f = open(out_fname,'w')
    out_f.write(out_csv_header)
    with open(in_fname, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # print(row['tmc_code'], row['measurement_tstamp'], row['speed'], row['cvalue'])
            out_str = row['tmc_code'] + ',' + row['measurement_tstamp'] + ',' + row['speed'] +  ',' + row['cvalue'] + '\n'
            out_f.write(out_str)
        # end_for
    # end_with
    out_f.close()
# end_def


# Perform Step 1 on all input files
#
for inf,outf in zip(from_fns,to_fns):
    s = 'Processing input ' + inf
    print(s)
    s = 'Generating output ' + outf
    print(s)
    extract_csv_with_subset_attrs(inf,outf)
# end_for


# Definition of function implementing Step 2: 
# Extract one day's worth of data from the intermediate output
#
# Function to extract the data for one day from the intermediate output,
# and write it to a CSV file whose name has the form: i93_nb_<yyyy>-<mm>-<dd>.csv
#
# The author acknowledges the use of a large sledge hammer here.
#
def extract_data_for(in_fname, out_fname_prefix, date_str):
    global out_csv_header  
    out_fname = out_fname_prefix + date_str + '.csv'
    out_f = open(out_fname, 'w')
    out_f.write(out_csv_header)

    with open(in_fname, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Debug
            # s = 'row[tstamp] = ' + row['tstamp']
            # print(row)
            #
            tstamp = row['tstamp']
            parts = tstamp.split(' ')
            date_part = parts[0]
            if date_part == date_str:
                # Debug
                # s = 'date_part test passed; date_part = ' + date_part
                # print(s)
                #
                out_str = row['tmc'] + ',' + row['tstamp'] + ',' + row['speed'] +  ',' + row['cvalue'] + '\n'
                out_f.write(out_str)
            # end_if
        # end_for
    # end_with
    out_f.close()
    s = 'Extraction of data for ' + date_str + ' completed.'
    print(s)
# end_def

# List of dates in the input CSV files.
# Note: This needs to be edited to reflect the dates for which data has been downloaded.
#       Alternatively, we _could_ read the input CSV and extract this information.
#       Consider this as a possible feature to implement in future.               
all_daytz = [   
                '2020-07-01',
                '2020-07-02',
                '2020-07-03',
                '2020-07-04',
                '2020-07-05',
                '2020-07-06',
                '2020-07-07',
                '2020-07-08',
                '2020-07-09',
                '2020-07-10',
                '2020-07-11',
                '2020-07-12',
                '2020-07-13',
                '2020-07-14',
                '2020-07-15',
                '2020-07-16',
                '2020-07-17',
                '2020-07-18',
                '2020-07-19',
                '2020-07-20',
                '2020-07-21',
                '2020-07-22',
                '2020-07-23',
                '2020-07-24',
                '2020-07-25',
                '2020-07-26',
                '2020-07-27',
                '2020-07-28',
                '2020-07-29',
                '2020-07-30',
                '2020-07-31'
            ]

# Note: the input to step 2 is the output of step 1.

in_fnames = []
in_fnames = to_fns

# base + 'I90_EB_data/i90_eb_'
                
out_prefixes = [  base + 'I90_EB_data/i90_eb_',
                  base + 'I90_WB_data/i90_wb_',
                  base + 'I93_NB_data/i93_nb_',
                  base + 'I93_SB_data/i93_sb_',
                  base + 'I95_NB_data/i95_nb_',
                  base + 'I95_SB_data/i95_sb_',
                  base + 'I290_EB_data/i290_eb_',
                  base + 'I290_WB_data/i290_wb_',
                  base + 'I495_NB_data/i495_nb_',
                  base + 'I495_SB_data/i495_sb_', 
                  base + 'US1_NB_data/us1_nb_',
                  base + 'US1_SB_data/us1_sb_', 
                  base + 'US3_NB_data/us3_nb_',
                  base + 'US3_SB_data/us3_sb_',
                  base + 'US44_EB_data/us44_eb_',
                  base + 'US44_WB_data/us44_wb_',               
                  base + 'SR2_EB_data/sr2_eb_',
                  base + 'SR2_WB_data/sr2_wb_',
                  base + 'SR3_NB_data/sr3_nb_',
                  base + 'SR3_SB_data/sr3_sb_',                          
                  base + 'SR24_NB_data/sr24_nb_',
                  base + 'SR24_SB_data/sr24_sb_',
                  base + 'SR128_NB_data/sr128_nb_',
                  base + 'SR128_SB_data/sr128_sb_',
                  base + 'SR140_NB_data/sr140_nb_',
                  base + 'SR140_SB_data/sr140_sb_',  
                  base + 'SR146_NB_data/sr146_nb_',
                  base + 'SR146_SB_data/sr146_sb_',              
                  base + 'SR213_EB_data/sr213_eb_',
                  base + 'SR213_WB_data/sr213_wb_',                           
                  base + 'N087_NB_data/n087_nb_',
                  base + 'N482_SB_data/n482_sb_'
                ]   

# Perform Step 2 on all files generated as the result of running Step 1.    
def perform_step_2(in_fnames, out_prefixes, daytz):
    for (phyle, prefix) in zip(in_fnames, out_prefixes):
        s1 = 'Processing file: ' + phyle
        print(s1)
        for d in daytz:
            s2 = '   Processing ' + d
            print(s2)
            extract_data_for(phyle, prefix, d)
    # end_for
# end_def