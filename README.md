# Color Iterator
The program find RGBWA color coordinates from given _u' v'_ color space coordinates 

# Usage
**Run program with [node.js](https://nodejs.org) from command line**
~~~
node index
~~~

# Options
The _resources/options.json_ file contains the names of the used files and the
parameters of the fitted curves

# Data sources
It uses two data sources from _/resources_

## _data.csv_
Contains the spectral data from the calibration and CIE values

## _targets.csv_
Contains the name of the data point and the designated u'v' coordinates

# Result
The results are printed to the _results.csv_ file