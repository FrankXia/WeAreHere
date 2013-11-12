/*jslint browser:true, nomen:true, white:true, sloppy:true, plusplus:true  */
/*global require:false, $:false, config:false, console:false */

var app, charting, chartUtils, UNITS, d3, cell;

app = {
	_buffer: null,
	_point: null,
	_distance: null,
	_distanceUnits: null,
	_alertBox: null,
    _carsl: null,
    _chartsDone: 0,
	init: function () {
        require(["esri/config", "esri/tasks/GeometryService"], function(esriConfig, GeometryService){
            esriConfig.defaults.io.proxyUrl = config.proxy;
        });
        
        app._carsl = $('#myCarousel div.carousel-inner');
        
		//Load distance into config
		app._distance = config.distance;
		app._distanceUnits = config.units;
		app._alertBox = $('<div id="alertBox"></div>').appendTo('#splashscreen .modal-body');
		$('.modal-footer').removeClass('fade');
        
	},
	
	test: function(){
		//nyc 40.73, -74
        require(["esri/geometry/Point"], function(Point) {
            app._point = new Point(-74, 40.73);
            app.buildCharts();
        });

	},
	
	geolocate: function(){
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.onGeoSuccess, app.onGeoError);
        } else {
            app.test();
        }
    },
    
    onGeoSuccess: function(position) {
        require(["esri/geometry/Point"], function(Point) {
                app._point = new Point(position.coords.longitude, position.coords.latitude);
                app.buildCharts();
            });
    },
    
    onGeoError: function(error) {
                    $('<div></div>').addClass('alert').addClass('alert-error').html('Error: Could not get coordinates; using NYC').appendTo(app._alertBox);
            app.test();
    },
	
	buildCharts : function(){
        app.logResult("Loading map data");
        // Instantiate the map
        app.createMap(app._carsl);
        // Begin the analysis process by buffering the point
		app.bufferPoint(app._point, app._distance, UNITS[app._distanceUnits]);

    },
    // Submit a buffer request
	bufferPoint: function(point, distance, unit) {
        require(["esri/tasks/GeometryService", "esri/tasks/BufferParameters" ], function(GeometryService, BufferParams){
            var params, gsvc;
            params = new BufferParams();
            params.geometries = [point];
            params.distances = [distance];
            params.geodesic = true;
            params.unit = unit;
            
            gsvc = new GeometryService(config.geometryURL);
            gsvc.buffer(params, app.onBuffer);
        });
	},
    // When the buffer returns, store it, place the point & buffer on hte map and
    // query the census service to determine the block groups
    onBuffer: function(geometries) {
        app._buffer = geometries[0];
        if (app.map.graphics) {
            app.placeGraphics();
        }
        else {
            require(['dojo/on'], function(on) {
                on.once(app.map, "load", app.placeGraphics);
            });
        }
        app.logResult('Loading Census data');
        
        require(["esri/tasks/query", "esri/tasks/QueryTask"], function(Query, QueryTask){
            var q, qt;
            q = new Query();
            q.geometry = app._buffer;
            q.outFields = config.blockGroup.fields;
            qt = new QueryTask(config.blockGroup.url);
            qt.execute(q, app.onQuery);
        });
    },
    
    // When the Query is complete, organize the block groups into a 'geotree'
    // Then start creating each chart, including the request for data
    onQuery: function(fSet) {
        var geoTree = app.createGeoTree(fSet.features);
        $.each(config.charts, function(index, chart){
            var chartId, chartNum;
            chartNum = index+1;
            chartId = 'itemContent' + chartNum;
            $(app.itemTemplate(chart, chartNum)).appendTo(app._carsl).height($('#myCarousel').height());
            $('#' + chartId).height($('#myCarousel').height()-55);
            app.getCensusData(chart, geoTree, chartNum );
        });
    },

	// Geotree is a tree-like structure based on state, county, tract and block groups
	createGeoTree:function(features) {
		var geoTree = {};
        
		$.each(features, function(count, graphic){
            var item, state, county, tract, blkgrp;
			item = graphic.attributes; 
			//"BLKGRP", "COUNTY", "STATE","TRACT"
			state = graphic.attributes.STATE;
			county = graphic.attributes.COUNTY;
			tract = graphic.attributes.TRACT;
			blkgrp = graphic.attributes.BLKGRP;
			if (!geoTree.hasOwnProperty(state)) { geoTree[state] = {}; }
			if (!geoTree[state].hasOwnProperty(county)) { geoTree[state][county] = {}; }
			if (!geoTree[state][county].hasOwnProperty(tract)) { geoTree[state][county][tract] = []; }
			if (geoTree[state][county][tract].indexOf(blkgrp) < 0) { geoTree[state][county][tract].push(blkgrp); }
		});
		return geoTree;
	},
	
    //Create & execute the request to the census
	getCensusData: function(chartProp, geoTree, chartNum) {
        require(["dojo/promise/all", "esri/request", "dojo/_base/array"], function(all, esriRequest, array){
            app.logResult('Requesting data for chart ' + chartNum);
            var statgroups, stats, dataURL, requests;
            dataURL = config[chartProp.dataURL];
            statgroups = chartProp.data;
            stats = [];
            requests = [];
            
            //aggregate the fields required into a one-dimensional array
            array.forEach(statgroups, function(statItem){
                if (typeof statItem.field === "string") {
                    stats.push(statItem.field);
                } else {
                    stats.push.apply(stats, statItem.field);
                }
            });

            //To get block group results, we need to make one data request per county
            $.each(geoTree, function(state, stateObj){
                $.each(stateObj, function(county, countyObj){
                    var inTerm, param, thisRequest;
                    thisRequest = esriRequest({
                            url: dataURL,
                            content : {
                                'key': config.censusKey,
                                'get': stats.join(','),
                                'for': 'block group:*',
                                'in' : 'state:'+state+"+county:"+county
                            },
                            handleAs: 'json'
                        });
                    requests.push(thisRequest);
                });
            });

            //When all the requests have been returned, re-organize the data into one object / one row 
            //Send the data for charting
            
            all(requests).then(function(results){
                var cleanData;
                cleanData = app.cleanResults(results, geoTree);
                charting.createChart(chartProp, cleanData, chartNum);

                //When the chart is made, check to see if this is the last chart; if so, remove the splashscreen
                app._chartsDone = app._chartsDone + 1;
                if (app._chartsDone === config.charts.length) {
                    $('#splashscreen').addClass('fade');
                    $('.carousel-control').css('visibility','visible');
                }
            });

        });

	},
    
	// Reformat the data from an array of array to an array of objects
	cleanResults: function(storageVar, geoTree) {
		var outData, bgUID;
        outData = {};
		//change the geoTree into an object with blockgroups
		$.each(geoTree, function(state, stateObj){
			$.each(stateObj, function(county, countyObj){
				$.each(countyObj, function(tract, tractArr){
					$.each(tractArr, function(tIndex, bg){
						bgUID = state + county + tract + String(bg); 
						if (!outData.hasOwnProperty(bgUID)) { outData[bgUID] = {}; }
					});
				});
			});
		});

		$.each(storageVar, function(count, request){
            var headerRow, tempStore, thisRow, thisCol, h, r, c;
			headerRow = request[0];
			tempStore = {};
			for(h=0; h < headerRow.length; h++){
				thisCol = headerRow[h];
				if (!tempStore.hasOwnProperty(thisCol)) { tempStore[thisCol] = []; }
			}
			for (r=1; r < request.length; r++){
				thisRow = request[r];
				for (c=0; c < thisRow.length; c++) {
					tempStore[headerRow[c]].push(thisRow[c]);
				}
			}
			$.each(tempStore['block group'], function(index, bg){
                var head, bgName;
				bgName = tempStore.state[index] + tempStore.county[index] + tempStore.tract[index] + String(bg);
				if (outData.hasOwnProperty(bgName)) {
//                    $.each(headerRow, function(h, header){
//                        app.logResult(header);
//                       if (header !== 'state' && header !== 'county' && header !== 'tract' && header !== 'block group') {
//							outData[bgName][thisCol] = tempStore[thisCol][index];		
//						}
//                    });
					for (head in headerRow){
						thisCol = headerRow[head];
						if (thisCol !== 'state' && thisCol!== 'county' && thisCol!== 'tract' && thisCol!== 'block group') {
							outData[bgName][thisCol] = tempStore[thisCol][index];		
						}
					}
				}
			});
		});
		return outData;
	},

    //Create the map and insert into the carousel
	createMap: function(carousel) {
		require(["esri/map", "dojo/domReady!"], function(Map){
            var mapParams, thisNum, chartId;
			mapParams = {title:'Stand in the place that you are', description:''};
			thisNum = 0;
			chartId = 'itemContent' + thisNum;

			$(app.itemTemplate(mapParams, thisNum)).appendTo(app._carsl).height($('#myCarousel').height());
			$('#'+chartId).height($('#myCarousel').height()-55);
            $('#item'+thisNum).addClass('active');

			app.map = new Map(chartId, {basemap:"gray", center: app._point});
		});
	},
	
    //Add the position and buffer
	placeGraphics: function() {
        require(["esri/graphic", "esri/symbols/PictureMarkerSymbol", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "dojo/_base/Color"], 
                function(Graphic, PMS, SFS, SLS, Color){
            var here, circle;
            if (app.map) {
                if (app.map.graphics) {app.map.graphics.clear();}
                here = new Graphic(app._point, new PMS({
                    "url":"img/here.png",
                    "height":19,
                    "width":16,
                    "type":"esriPMS"
                }));
                circle = new Graphic(app._buffer, new SFS(SFS.STYLE_NULL, new SLS(SLS.STYLE_SOLID, new Color([255,255,0]), 2), new Color([255,255,0])));
                app.map.graphics.add(here);
                app.map.graphics.add(circle);
                app.map.setExtent(app._buffer.getExtent().expand(1.2), true);
           } 
        });
	},
		
    //Log to console & the splashscreen
	logResult:function(data){
        $('<div></div>').addClass('alert-info').addClass('alert-info').html(data).appendTo(app._alertBox);
		console.log(data);
	},	

    //Carousel item template
	itemTemplate: function(params, num){
		var template = '<div id="item'+num+'" class="item active">';
		template += '<div id="itemContent'+num+'" class="itemContent"></div>';
		template += '<div class="carousel-caption"><h4>' + params.title + '</h4><p>'+params.description+'</p></div>';
		template += '</div>';
		return template;
	}//,

};

charting = {
    createChart: function (chartParams, data, itemNum) {
		switch(chartParams.type){
			case 'pie':
				charting.createPieChart(chartParams, data, itemNum);
				break;
			case 'treemap':
				charting.createTreeMap(chartParams, data, itemNum);
				break;
			case 'pyramid':
				charting.createPyramidChart(chartParams, data, itemNum);
				break;
			case 'stackedBar':
				charting.createStackedBars(chartParams, data, itemNum);
				break;
			default:
				break;				
		}
        app.logResult("Created Chart #" + itemNum);
	},
	
	createStackedBars: function(chartParams, data, itemNum) {
        var chartId, chartData, operation, chartItems, categories, allSeries, seriesLabels, chartObj, plot;
		chartId = 'itemContent' + itemNum;
		chartData = [];
		operation = chartUtils.getOperation(chartParams.statistic);
		chartItems = operation(chartParams, data);
		categories = [];
		allSeries = [];
		seriesLabels = [];
		chartObj = {};

		$.each(chartItems, function(index, item){
			if (categories.indexOf(item.category) < 0) {categories.push(item.category);}
			if (seriesLabels.indexOf(item.label) < 0) {seriesLabels.push(item.label);}
			if (!chartObj.hasOwnProperty(item.label)) {chartObj[item.label] = [];}
			chartObj[item.label].push(item.value);
		});
		
		$.each(seriesLabels, function(index, series){
			allSeries.push(chartObj[series]);
			seriesLabels[index] = {'label': series};
		});

		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>');
        
		plot = $.jqplot(chartId + '_inner', allSeries,
		{
			seriesColors: chartParams.colors,
			stackSeries: true,
			seriesDefaults:{
				renderer:$.jqplot.BarRenderer,
				rendererOptions: {
					barMargin: 30,
					highlightMouseDown: true   
                },
                pointLabels: {show: true}
            },
            series: seriesLabels,
            axes: {
                xaxis: {
                    renderer: $.jqplot.CategoryAxisRenderer,
                    ticks: categories
                },
                yaxis: {
                    padMin: 0
                }
            },
            legend: {
				show: true,
				location: 's',
				placement: 'outsideGrid'
			}      
		});
		$('window').on('resize', function(event){plot.redraw();});
		if (itemNum !== 0) {$('#item'+itemNum).removeClass('active');}
	},
	createPieChart: function(chartParams, data, itemNum) {
        var chartId, chartData, operation, chartItems, plot;
		chartId = 'itemContent' + itemNum;
		chartData = [];
		operation = chartUtils.getOperation(chartParams.statistic);
		chartItems = operation(chartParams, data);
		$.each(chartItems, function(index, item){
			chartData.push([item.label, item.value]);
		});
		
		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>');

		//For each field, get the statistic
		plot = $.jqplot(chartId + '_inner', [chartData],
			{
				seriesDefaults: {
					renderer: $.jqplot.PieRenderer,
					rendererOptions: {
						showDataLabels: true
					}
				},
				legend: {show:true, location:'e', placement: "outsideGrid"}
			});
		$(window).resize(function(event){plot.redraw();});
		if (itemNum !== 0) {$('#item'+itemNum).removeClass('active');}
	},
	
	createTreeMap: function(chartParams, data, itemNum){
        var chartId, operation, chartItems, treeData, treeObj, width, height, color, treemap, div;
		chartId = 'itemContent' + itemNum;
		operation = chartUtils.getOperation(chartParams.statistic);
		chartItems = operation(chartParams, data);
		treeData = {name: chartParams.title, children:[]};
		treeObj = {};
		$.each(chartItems, function(index, item){
			if (!treeObj.hasOwnProperty(item.category)) {treeObj[item.category] = {name: item.category, children: []};}
			treeObj[item.category].children.push({name: item.label, value: item.value});
		});
		$.each(treeObj, function(key, value){
			treeData.children.push(value);
		});
		width = $('#' + chartId).innerWidth(); 
        height = $('#' + chartId).innerHeight();
        color = d3.scale.category20c();
		treemap = d3.layout.treemap().size([width, 0.85 * height]).round(true).value(function(d){return d.value;});
		
		div = d3.select('#'+chartId).append("div")
			.style("position", "relative")
			.style("width", width + "px")
			.style("height", "85%");
			
		div.data([treeData]).selectAll("div").data(treemap.nodes).enter().append("div").attr("class", "cell");
        div.style("background", function(d) { return d.children ? color(d.name) : null; }).call(cell).text(function(d){return d.children ? null : d.name + ' (' + d.value + ')';});
        
        if (itemNum !== 0) {$('#item'+itemNum).removeClass('active');}
	},

	createPyramidChart : function(chartParams, data, itemNum){
        var chartId, chartData, operation, chartItems, chartObj, seriesLabels, ticks, series0, series1, plotOptions, plot1;
		chartId = 'itemContent' + itemNum;
		chartData = [];
		operation = chartUtils.getOperation(chartParams.statistic);
		chartItems = operation(chartParams, data);
		chartObj = {};
		seriesLabels = [];
        ticks = [];series0=[]; series1=[];

		$.each(chartItems, function(index, item){
			if (seriesLabels.indexOf(item.category) < 0) {seriesLabels.push(item.category);}
			if (!chartObj.hasOwnProperty(item.label)) {chartObj[item.label] = {};}
			chartObj[item.label][item.category] = item.value;
		});
		
		$.each(chartObj, function(key, value){
			ticks.push(key);
			series0.push(value[seriesLabels[0]]);
			series1.push(value[seriesLabels[1]]);
		});
		
		plotOptions = {
			title: '<div style="float:left;width:50%;text-align:center">' + seriesLabels[0] + '</div><div style="float:right;width:50%;text-align:center">' + seriesLabels[1] +'</div>',
			seriesColors: chartParams.colors,
			grid:{},
			defaultAxisStart: 0,
			seriesDefaults: {
				renderer: $.jqplot.PyramidRenderer,
                rendererOptions: {
                    barPadding: 0
                },
                yaxis: "yaxis",
                shadow: false
			},
			series: [
			{
                rendererOptions:{
                    side: 'left',
                    synchronizeHighlight: 1
                },
                yaxis : "yMidAxis",
                xaxis: "xaxis"
            },
            {
                //yaxis: "y2axis",
                rendererOptions:{
                    synchronizeHighlight: 0
                },
                xaxis: "xaxis",
                yaxis : "yMidAxis"
            }
			],
			axes:{
				xaxis: {
                    tickOptions: {},
                    rendererOptions: {
                        baselineWidth: 2
                    }
                },
                yMidAxis: {
                    label: "Age",
                    // include empty tick options, they will be used
                    // as users set options with plot controls.
                    tickOptions: {},
                    showMinorTicks: true,
                    ticks: ticks,
                    rendererOptions: {
                        category: true,
                        baselineWidth: 2
                    }
                }	
			}
		};
		//To get the axis right, create in internal div //style="height:90%; width:100%"
		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>');
		plot1 = $.jqplot(chartId + '_inner', [series0, series1], plotOptions);
		//.style("height",$("#"+chartId).innerHeight - 50);
		$('window').on('resize', function(event){plot1.redraw();});
		if (itemNum !== 0) { $('#item'+itemNum).removeClass('active');}
	}
};

chartUtils = {
	getOperation: function(statType){
		var outFunction;
		switch(statType) {
			case 'sum':
				outFunction = chartUtils.sumColumn;
				break;
			case 'sumCat':
				outFunction = chartUtils.sumCategory;
				break;
			case 'average':
				outFunction = chartUtils.avgColumn;
				break;
			default:
				break;
		}
		return outFunction;
		
	},
	
	sumColumn: function(chartParams, data){
        var outVal;
		outVal = [];
		$.each(chartParams.data, function(index, item){
            var thisField, fieldValue;
			thisField = item.field;
			//automatically handle grouped fields by treating the field as an array
			if (typeof thisField === "string"){thisField = [thisField];}
			fieldValue = 0;
			$.each(thisField, function(index, field){
				$.each(data, function(key, obj){
					fieldValue += parseFloat(data[key][field]);
				});	
			});
			item.value = fieldValue;
			outVal.push(item);
			
		});
		return outVal;
	},
	
	sumCategory: function(chartParams, data) {
		var outVal, outObj;
        outVal = [];
		outObj = {};
		$.each(chartParams.data, function(index, item){
            var thisField, thisCategory;
			thisField = item.field;
			thisCategory = item.category;
			if (!outObj.hasOwnProperty(thisCategory)) {outObj[thisCategory] = {label: thisCategory, value: 0};}
			$.each(data, function(key, obj){
				outObj[thisCategory].value += parseFloat(data[key][thisField]);
			});			
		});
		$.each(outObj, function(key, obj){
			outVal.push(outObj[key]);
		});
		return outVal;
	},
	
	avgColumn: function(chartParams, data){
        var outVal, sum;
		outVal = [];
		sum = chartUtils.sumColumn(chartParams, data);
		$.each(sum, function(index, item){
			item.value = item.value / data.length;
			outVal.push(item);
		});
		return sum / data.length;
	}  
};

//codes for units
UNITS = {
	"meters" : 9001,
	"feet" : 9002,
	"kilometers" : 9036,
	"miles" : 9035
};

//used in calculating treemap cell size
cell = function () {
  this
      .style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
};
