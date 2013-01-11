/*TODO
 * 
 * -School Enrollment Chart -stacked bar
 * 
 */

var app = {
	_buffer: null,
	_point: null,
	_distance: null,
	_distanceUnits: null,
	_alertBox: null,
	results:[],
	init: function() {
		//$('#splashscreen').modal('show');
		//----- AJAX SETUP -----
		//Enable the proxy
		$.ajaxPrefilter(function(options){
			if (options.crossDomain) {
				var paramString = $.param(options.data)
				if (config.proxy.length + options.url.length + paramString.length > 1500) {
					options.url = config.proxy + "?" + options.url;
					options.type = 'POST';
				}  else if (options.processData){
					options.url = config.proxy + "?" + options.url + "?" + paramString; //encodeURIComponent(options.url);
					options.processData = false;				
				} else {
					options.url = config.proxy + "?" + options.url + "?" + options.data; //encodeURIComponent(options.url);
				}
				options.crossDomain = false;
			}
		});
		//Assume JSON as the default dataType
		$.ajaxSetup({
			dataType: "json",
			error: app.onError
		});
		
		//Load distance into config
		app._distance = config.distance;
		app._distanceUnits = config.units;
		app._alertBox = $('<div id="alertBox"></div>').appendTo('#splashscreen .modal-body');
		$('.modal-footer').removeClass('fade');	
	},
	
	test: function(){
		//nyc 40.73, -74
		//just south of quantico 38.5, -77.5
		app._point = {x: -74, y: 40.73};
		app.buildCharts();

	},
	
	geolocate: function(){
		if (navigator.geolocation) {
    			navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError);
    	} else {
    		app.test()
    	}
    	function onGeoSuccess(position){
    		app._point = {x: position.coords.longitude, y: position.coords.latitude};
    		app.buildCharts();
    	}
    	function onGeoError(error) {
    		$('<div></div>').addClass('alert').addClass('alert-error').html('Error: Could not get coordinates; using NYC').appendTo(app._alertBox);
    		app.test();
    	}
	},
	
	buildCharts : function(){
		var carsl = $('#myCarousel div.carousel-inner');
		$('<div></div>').addClass('alert-info').addClass('alert-info').html('Loading Map Data').appendTo(app._alertBox);

//Should reorder to 
// 1) Point & Buffer (1 for all stats)
// 2) Create map
// 3) Create charts
		app.createMap(carsl);
		app.bufferPoint(app._point.y, app._point.x, app._distance, UNITS[app._distanceUnits], function(data) {
			app._buffer = data;
			if (app.map.graphics) {app.placeGraphics();}
			else {dojo.connect(app.map, 'onLoad', app.placeGraphics);}
			
			$('<div></div>').addClass('alert-info').addClass('alert-info').html('Loading Census Data').appendTo(app._alertBox);
			app.selectFeaturesByArea(config.blockGroup, data.geometries, "esriSpatialRelIntersects", function(data){
				var geoTree = app.createGeoTree(data.features)
				$.each(config.charts, function(index, chart){
					var chartResults = [];
					var requests = app.getCensusData(chart, geoTree, chartResults );
					$.when.apply($, requests).done(function(){
						var cleanData = app.cleanResults(chartResults, geoTree);
						app.createChart(chart, cleanData, carsl);
						app.logResult('Chart ' +index);
						$('<div></div>').addClass('alert-info').addClass('alert-info').html('Created Chart #' + (index + 1)).appendTo(app._alertBox);
						if (index + 1 == config.charts.length) {
							app.logResult('Done?');
							$('#splashscreen').addClass('fade');
							$('.carousel-control').css('visibility','visible');
							app.logResult('Modal hidden?');
						}
					});
				});
			});
		});
//		$('#splashscreen').addClass('fade');

/*
		app.createMap(carsl);
		//var chart = config.charts[0];
		$('<div></div>').addClass('alert-info').addClass('alert-info').html('Loading data from the Census').appendTo(app._alertBox);

		$.each(config.charts, function(index, chart){
			//console.log(chart);
			var chartResults = []
			app.bufferPoint(app._point.y, app._point.x, chart.distance, UNITS[chart.units], function(data){
				app.selectFeaturesByArea(config.blockGroup, data.geometries, "esriSpatialRelIntersects", function(data){
					var geoTree = app.createGeoTree(data.features)
					var requests = app.getCensusData(chart, geoTree, chartResults );
					$.when.apply($, requests).done(function(){
						var cleanData = app.cleanResults(chartResults, geoTree);
						app.createChart(chart, cleanData, carsl);
						app.logResult('Chart ' +index);
						$('<div></div>').addClass('alert-info').addClass('alert-info').html('Created Chart #' + (index + 1)).appendTo(app._alertBox);
						if (index + 1 == config.charts.length) {
							app.logResult('Done?');
							$('#splashscreen').addClass('fade');
							$('.carousel-control').css('visibility','visible');
							app.logResult('Modal hidden?');
						}
					});
	
				});
			});
		});
	*/

	},
	bufferPoint: function(latitude, longitude, distance, unit, callback) {
		var params = {
			"geometries" : longitude+','+latitude,
			"inSR" : 4326,
			"distances": distance,
			"unit": unit,
			"f":"json",
		}
		$.ajax({
			url: config.geometryURL + "/buffer",
			data: params,
			success: callback
		});
	},

	selectFeaturesByArea: function(features, geometries, spatialRel, callback) {
		var geomString = app.polygonToString(geometries);
		var params = {
			"f": "json",
			"geometry": geomString,
			"geometryType" : 'esriGeometryPolygon',
			"spatialRel": spatialRel,
			"inSR": 4326,
			"returnGeometry": "false",
			"outFields": features.fields.join(",")
		};
		
		$.ajax({
			url:features.url + "/query",
			data: params,
			success: callback
		})
	},

	polygonToString: function(geometries) {
		var thisPoly = geometries[0];
		var outString = "{rings : [";
		$.each(thisPoly.rings, function(ring){
			var thisRing = thisPoly.rings[ring];
			outString += "[";
			var pointCollection = []
			$.each(thisRing, function(point){
				var thisPoint = thisRing[point];
				pointCollection.push("["+thisPoint[0]+","+thisPoint[1]+"]");
			});
			outString += pointCollection.join(",");
			outString += "]";
		});
		
		outString += "],'spatialReference' : {'wkid' : 4326}}"
		return outString;
	},
	// Move to a census data provider file
	createGeoTree:function(features) {
		var geoTree = {};
		$.each(features, function(count, graphic){
			var item = graphic.attributes; 
			//"BLKGRP", "COUNTY", "STATE","TRACT"
			var state = graphic.attributes["STATE"];
			var county = graphic.attributes["COUNTY"];
			var tract = graphic.attributes["TRACT"];
			var blkgrp = graphic.attributes["BLKGRP"];
			if (!geoTree.hasOwnProperty(state)) geoTree[state] = {};
			if (!geoTree[state].hasOwnProperty(county)) geoTree[state][county] = {};
			if (!geoTree[state][county].hasOwnProperty(tract)) geoTree[state][county][tract] = []
			if (geoTree[state][county][tract].indexOf(blkgrp) < 0) geoTree[state][county][tract].push(blkgrp);
		});
		return geoTree;
	},
	// Move to a census data provider file
	sliceArrays: function(inArray, size) {
		if (size == null) size = 5;
		var s, outArray, done
		outArray = [];
		done = false;
		s = 0;
		while (!done) {
			var end = (s + size > inArray.length) ? inArray.length : s + size;
			outArray.push(inArray.slice(s, end));
			if (s + size >= inArray.length){ done = true};
			s = s + size;
		}
		return outArray;
	},
	// Move to a census data provider file
	getFields: function(dataList, size) {
		if (size == null) size = 5;
		var outArray, tempArray;
		outArray = [];
		tempArray = [];
		$.each(dataList, function(i, item){
			if (typeof item.field == 'string') {
				tempArray.push(item.field);			
				if (tempArray.length == size) {
					outArray.push(tempArray);
					tempArray = [];
				}
			} else {
				//Assume it's an array
				$.each(item.field, function(index, field) {
					tempArray.push(field);
					if (tempArray.length == size) {
						outArray.push(tempArray);
						tempArray = [];
					}
				});
			}

		});
		if (tempArray.length > 0) outArray.push(tempArray);
		return outArray

	}, 
	// Move to a census data provider file
	getCensusData: function(chartProp, geoTree,  storageVar) {
		/* ----Current limitations of the API----
		 * 5 fields per transactions
		 * Need to tabulate by tracts and send a request set per tract
		 */
		
		var statgroups, geoTree, dataURL;
		dataURL = config[chartProp.dataURL];
		//Break out data into groups of 5
		statgroups = app.getFields(chartProp.data, 5);
				
		var requests = [];
		$.each(geoTree, function(state, stateObj){
			$.each(stateObj, function(county, countyObj){
				$.each(countyObj, function(tract, tractArr){
					$.each(statgroups, function(stcount, stats){
						var inTerm = 'state:'+state+"+county:"+county+"+tract:"+tract;
						var paramString = 'key=' + config.censusKey + "&get=" + stats.join(',') + "&for=block+group:*&in=" + inTerm
						var params = {
							'key' : config.censusKey,
							'get' : stats.join(','),
							'for' : 'block+group:*',
							'in' : inTerm
						}
						var thisRequest = $.ajax({
							'url' : dataURL,
							'data' : paramString,
							'dataType' : 'json',
							'processData' : false,
							success: function(data){
								storageVar.push(data);	
							}
						});
						requests.push(thisRequest);
					});
				});
			});
		});
		return requests;
	},
	// Move to a census data provider file
	cleanResults: function(storageVar, geoTree) {
		var outData = {};
		//change the geoTree into an object with blockgroups
		$.each(geoTree, function(state, stateObj){
			$.each(stateObj, function(county, countyObj){
				$.each(countyObj, function(tract, tractArr){
					$.each(tractArr, function(tIndex, bg){
						bgUID = state + county + tract + String(bg); 
						if (!outData.hasOwnProperty(bgUID)) outData[bgUID] = {};				
					});
				});
			});
		});

		$.each(storageVar, function(count, request){
			var headerRow = request[0];
			var tempStore = {};
			for(var h=0; h < headerRow.length; h++){
				var thisCol = headerRow[h];
				if (!tempStore.hasOwnProperty(thisCol)) tempStore[thisCol] = []; 
			}
			for (var r=1; r < request.length; r++){
				var thisRow = request[r];
				for (var c=0; c < thisRow.length; c++) {
					tempStore[headerRow[c]].push(thisRow[c]);
				}
			}
			$.each(tempStore['block group'], function(index, bg){
				var bgName = tempStore['state'][index] + tempStore['county'][index] + tempStore['tract'][index] + String(bg);
				if (outData.hasOwnProperty(bgName)) {
					for (var h in headerRow){
						var thisCol = headerRow[h];
						if (thisCol != 'state' && thisCol!= 'county' && thisCol!= 'tract' && thisCol!= 'block group') {
							outData[bgName][thisCol] = tempStore[thisCol][index];		
						}
					}
				}
			});
		});
		return outData;
	},

	createMap: function(carousel) {
		require(["esri/Map", "dojo/domReady!"], function(Map){
			var mapParams = {title:'Stand in the place that you are', description:''};
			var thisNum = app.getItemNum();
			var chartId = 'itemContent' + thisNum;
//			carousel.append();
			$(app.itemTemplate(mapParams, thisNum)).appendTo(carousel).height($('#myCarousel').height());
			$('#'+chartId).height($('#myCarousel').height()-55);

			var initExtentDD = new esri.geometry.Extent(app._point.x-.25, app._point.y-.25,app._point.x+.25, app._point.y+.25, new esri.SpatialReference({ wkid: 4326 }))
			var initExtentWM = esri.geometry.geographicToWebMercator(initExtentDD);
			esri.config.defaults.io.proxyUrl = config.proxy;
			app.map = new esri.Map(chartId, {extent:initExtentWM});
			var bgLayer = new esri.layers.ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer");
			var refLayer = new esri.layers.ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer");
						
        	app.map.addLayers([bgLayer, refLayer]);
        	//dojo.connect(app.map, "onLoad", app.placePoint);
        	dojo.connect(app.map, "onLoad", function(){
        		dojo.connect(window, 'resize', app.map, app.map.resize);
        	});

        	if (thisNum != 0) $('#item'+thisNum).removeClass('active');
		});
	},
	
	placeGraphics: function() {
		if (app.map) {
			if (app.map.graphics) app.map.graphics.clear();
			var hereWM = esri.geometry.geographicToWebMercator(new esri.geometry.Point(app._point.x, app._point.y, new esri.SpatialReference({ wkid: 4326 })));
			var symbol = new esri.symbol.PictureMarkerSymbol({
				"url":"img/here.png",
				"height":19,
				"width":16,
				"type":"esriPMS"
			});
			var pointGraphic = new esri.Graphic(hereWM, symbol)
			var bufferGeom = new esri.geometry.Polygon(new esri.SpatialReference({ wkid: 4326 }));
			bufferGeom.addRing(app._buffer.geometries[0].rings[0]);
			var bufferGeomWM = esri.geometry.geographicToWebMercator(bufferGeom);
			var bufferSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL, 
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 255, 0]), 2),
				new dojo.Color([255, 255, 0]));
			var bufferGraphic = new esri.Graphic(bufferGeomWM, bufferSymbol);
			app.map.graphics.add(pointGraphic);
			app.map.graphics.add(bufferGraphic);
			app.map.setExtent(bufferGraphic.geometry.getExtent().expand(2), true);
		}
		
	},
		
	createChart: function(chartParams, data, carousel){
		thisNum = app.getItemNum();
		chartId = 'itemContent' + thisNum;
		$(app.itemTemplate(chartParams, thisNum)).appendTo(carousel).height($('#myCarousel').height());
		$('#' + chartId).height($('#myCarousel').height()-55)

	//	carousel.append(app.itemTemplate(chartParams, thisNum));
		switch(chartParams.type){
			case 'pie':
				app.createPieChart(chartParams, data, thisNum);
				break;
			case 'treemap':
				app.createTreeMap(chartParams, data, thisNum);
				break;
			case 'pyramid':
				app.createPyramidChart(chartParams, data, thisNum);
				break;
			case 'stackedBar':
				app.createStackedBars(chartParams, data, thisNum);
				break;
			default:
				break;
				
		}
	},
	
	createStackedBars: function(chartParams, data, itemNum) {
		var chartId = 'itemContent' + itemNum;
		var chartData = [];
		var operation = app.getOperation(chartParams.statistic);
		var chartItems = operation(chartParams, data);
		var categories = [];
		var allSeries = [];
		var seriesLabels = [];
		var chartObj = {}

		$.each(chartItems, function(index, item){
			if (categories.indexOf(item.category) < 0) {categories.push(item.category)};
			if (seriesLabels.indexOf(item.label) < 0) {seriesLabels.push(item.label)};
			if (!chartObj.hasOwnProperty(item.label)) {chartObj[item.label] = []};
			chartObj[item.label].push(item.value)
		});
		
		$.each(seriesLabels, function(index, series){
			allSeries.push(chartObj[series]);
			seriesLabels[index] = {'label': series}
		});

		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>');
		var plot = $.jqplot(chartId + '_inner', allSeries,
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
		$('window').on('resize', function(event){plot.redraw();})
		if (thisNum != 0) $('#item'+thisNum).removeClass('active');

	},
	createPieChart: function(chartParams, data, itemNum) {
		var chartId = 'itemContent' + itemNum;
		var chartData = [];
		var operation = app.getOperation(chartParams.statistic);
		var chartItems = operation(chartParams, data);
		$.each(chartItems, function(index, item){
			chartData.push([item.label, item.value]);
		});
		
		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>')

		//For each field, get the statistic
		var plot = $.jqplot(chartId + '_inner', [chartData],
			{
				seriesDefaults: {
					renderer: $.jqplot.PieRenderer,
					rendererOptions: {
						showDataLabels: true
					}
				},
				legend: {show:true, location:'e', placement: "outsideGrid"}
			});
		$(window).resize(function(event){plot.redraw();})
		if (itemNum != 0) $('#item'+itemNum).removeClass('active');
	},
	
	createTreeMap: function(chartParams, data, itemNum){
		var chartId = 'itemContent' + itemNum;
		var operation = app.getOperation(chartParams.statistic);
		var chartItems = operation(chartParams, data);
		var treeData = {name: chartParams.title, children:[]};
		var treeObj = {};
		$.each(chartItems, function(index, item){
			if (!treeObj.hasOwnProperty(item.category)) treeObj[item.category] = {name: item.category, children: []};
			treeObj[item.category].children.push({name: item.label, value: item.value});
		});
		$.each(treeObj, function(key, value){
			treeData.children.push(value);
		});
		var width = $('#' + chartId).innerWidth(), height = $('#' + chartId).innerHeight(), color = d3.scale.category20c();
		var treemap = d3.layout.treemap()
			.size([width, .85 * height])
			.round(true)
			.value(function(d){return d.value});
		
		var div = d3.select('#'+chartId).append("div")
			.style("position", "relative")
			.style("width", width + "px")
			.style("height", "85%");
			
		div.data([treeData]).selectAll("div")
			.data(treemap.nodes)
			.enter().append("div")
			.attr("class", "cell")
			.style("background", function(d) { return d.children ? color(d.name) : null; })
			.call(cell)
			.text(function(d){return d.children ? null : d.name + ' (' + d.value + ')'});
		
  		if (itemNum != 0) $('#item'+itemNum).removeClass('active');
	},

	createPyramidChart : function(chartParams, data, itemNum){
		var chartId = 'itemContent' + itemNum;
		var chartData = [];
		var operation = app.getOperation(chartParams.statistic);
		var chartItems = operation(chartParams, data);
		var chartObj = {}
		var seriesLabels = [], ticks = [], series0=[], series1=[];

		$.each(chartItems, function(index, item){
			if (seriesLabels.indexOf(item.category) < 0) seriesLabels.push(item.category)
			if (!chartObj.hasOwnProperty(item.label)) chartObj[item.label] = {};
			chartObj[item.label][item.category] = item.value
		});
		
		$.each(chartObj, function(key, value){
			ticks.push(key);
			series0.push(value[seriesLabels[0]]);
			series1.push(value[seriesLabels[1]]);
		});
		
		var plotOptions = {
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
                yaxis: "y2axis",
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
                },	
			}
		};
		//To get the axis right, create in internal div //style="height:90%; width:100%"
		$('#' + chartId).append('<div id="' + chartId + '_inner" class="innerBox" ></div>')
		var plot1 = $.jqplot(chartId + '_inner', [series0, series1], plotOptions)
		//.style("height",$("#"+chartId).innerHeight - 50);
		$('window').on('resize', function(event){plot1.redraw();})
		if (itemNum != 0) $('#item'+itemNum).removeClass('active');
	},
	
	getOperation: function(statType){
		var outFunction;
		switch(statType) {
			case 'sum':
				outFunction = app.sumColumn;
				break;
			case 'sumCat':
				outFunction = app.sumCategory;
				break;
			case 'average':
				outFunction = app.avgColumn;
				break;
			default:
				break;
		}
		return outFunction;
		
	},
	
	sumColumn: function(chartParams, data){
		outVal = [];
		$.each(chartParams.data, function(index, item){
			var thisField = item.field;
			//automatically handle grouped fields by treating the field as an array
			if (typeof thisField == "string"){thisField = [thisField]}
			var fieldValue = 0;
			$.each(thisField, function(index, field){
				$.each(data, function(key, obj){
					fieldValue += parseFloat(data[key][field]);
				});	
			});
			item.value = fieldValue;
			outVal.push(item);
			
		});
		return outVal
	},
	
	sumCategory: function(chartParams, data) {
		var outVal = [];
		var outObj = {};
		$.each(chartParams.data, function(index, item){
			var thisField = item.field;
			var thisCategory = item.category;
			if (!outObj.hasOwnProperty(thisCategory)) outObj[thisCategory] = {label: thisCategory, value: 0};
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
		var outVal = [];
		var sum = app.sumColumn(chartParams, data)
		$.each(sum, function(index, item){
			item.value = item.value / data.length
			outVal.push(item);
		});
		return sum / data.length;
	},

	logResult:function(data){
		console.log(data)
	},	
	
	onError: function(jqX, status, httpError) {
		console.log('-----Error-----')
		console.log(jqX.url);
		console.log(status);
		if (httpError) {
			console.log(httpError)
		}
		console.log('---------------');
	},	
	
	itemTemplate: function(params, num){
		var template = '<div id="item'+num+'" class="item active">';
		template += '<div id="itemContent'+num+'" class="itemContent"></div>';
		template += '<div class="carousel-caption"><h4>' + params.title + '</h4><p>'+params.description+'</p></div>';
		template += '</div>';
		return template;
	},
	
	getItemNum: function() {
		if (app.hasOwnProperty('_item')) {
			app['_item'] += 1;
		} else {
			app['_item'] = 0;
		}
		return app['_item'];
	}
};


var UNITS = {
	"meters" : 9001,
	"feet" : 9002,
	"kilometers" : 9036,
	"miles" : 9035
}

function cell() {
  this
      .style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
}
