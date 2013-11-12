/*jslint browser:true, nomen:true, white:true, sloppy:true, plusplus:true  */
/*global app:false, chartUtils: false, $: false, d3: false, cell:false */
var charting = {
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

var chartUtils = {
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