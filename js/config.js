/*TODO
 * 
 * -School Enrollment Chart -stacked bar
 * -population pyramid - 5yr intervals
 * -housing/vacancy - pie
 * -convert commute to tree map (check dojox)
 * 
 */

var config = {
	proxy: "/proxy/proxy.ashx",
	blockGroup : {
		"url": "http://tigerweb.geo.census.gov/ArcGIS/rest/services/Tracts_Blocks/MapServer/1",
		"fields": ["BLKGRP", "COUNTY", "STATE", "TRACT"]
	},
	distance: 1,
    units: 'miles',
	geometryURL : "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",
	censusSF1URL: "http://api.census.gov/data/2010/sf1",
	censusACSURL: "http://api.census.gov/data/2010/acs5",
	censusKey: "cb757c508f9edbc4b892236bbd38a35843e2b2c6",
	charts: [
        {
            title: "Our Castle and Our Keep",
            type: "pie",
            statistic: 'sumCat',
            distance: 1,
            units: 'miles',
            description: "Housing Unit Tenure & Vacancy (2010 Census SF1)",
            dataURL: 'censusSF1URL',
            data: [	{field: 'H0040002', label: 'Owned with a mortgage or a loan', category: 'Owned'},
				{field: 'H0040003', label: 'Owned free and clear', category: 'Owned'},
				{field: 'H0040004', label: 'Renter occupied', category: 'Rented'},
				{field: 'H0050001', label: 'Vacant housing units', category: 'Vacant'}
                  ]
        },
        {
            title: "And another 100 people...",
            type: "pyramid",
            statistic: 'sum',
            distance: 1,
            units: 'miles',
            description: "Population by Age (2010 Census SF1)",
            dataURL: 'censusSF1URL',
            colors: ["#5882FA", "#F78181", "#D358F7", "#F7FE2E"],
            data : [
                {"label": "<5", "field": "P0120003", "category": "Male"},
                {"label": "5 - 9", "field": "P0120004", "category": "Male"},
                {"label": "10 - 14", "field": "P0120005", "category": "Male"},
                {"label": "15 - 19", "field": ["P0120006", "P0120007"], "category": "Male"},
                {"label": "20 - 24", "field": ["P0120008", "P0120009", "P0120010"], "category": "Male"},
                {"label": "25 - 29", "field": "P0120011", "category": "Male"},
                {"label": "30 - 34", "field": "P0120012", "category": "Male"},
                {"label": "35 - 39", "field": "P0120013", "category": "Male"},
                {"label": "40 - 44", "field": "P0120014", "category": "Male"},
                {"label": "45 - 49", "field": "P0120015", "category": "Male"},
                {"label": "50 - 54", "field": "P0120016", "category": "Male"},
                {"label": "55 - 59", "field": "P0120017", "category": "Male"},
                {"label": "60 - 64", "field": ["P0120018", "P0120019"], "category": "Male"},
                {"label": "65 - 69", "field": ["P0120020", "P0120021"], "category": "Male"},
                {"label": "70 - 74", "field": "P0120022", "category": "Male"},
                {"label": "75 - 79", "field": "P0120023", "category": "Male"},
                {"label": "80 - 84", "field": "P0120024", "category": "Male"},
                {"label": "85+", "field": "P0120025", "category": "Male"},
                {"label": "<5", "field": "P0120027", "category": "Female"},
                {"label": "5 - 9", "field": "P0120028", "category": "Female"},
                {"label": "10 - 14", "field": "P0120029", "category": "Female"},
                {"label": "15 - 19", "field": ["P0120030", "P0120031"], "category": "Female"},
                {"label": "20 - 24", "field": ["P0120032", "P0120033", "P0120034"], "category": "Female"},
                {"label": "25 - 29", "field": "P0120035", "category": "Female"},
                {"label": "30 - 34", "field": "P0120036", "category": "Female"},
                {"label": "35 - 39", "field": "P0120037", "category": "Female"},
                {"label": "40 - 44", "field": "P0120038", "category": "Female"},
                {"label": "45 - 49", "field": "P0120039", "category": "Female"},
                {"label": "50 - 54", "field": "P0120040", "category": "Female"},
                {"label": "55 - 59", "field": "P0120041", "category": "Female"},
                {"label": "60 - 64", "field": ["P0120042", "P0120043"], "category": "Female"},
                {"label": "65 - 69", "field": ["P0120044", "P0120045"], "category": "Female"},
                {"label": "70 - 74", "field": "P0120046", "category": "Female"},
                {"label": "75 - 79", "field": "P0120047", "category": "Female"},
                {"label": "80 - 84", "field": "P0120048", "category": "Female"},
                {"label": "85+", "field": "P0120049", "category": "Female"}
            ]
        },
        {
            title: "... just got off of the train",
            type: "pie",
            statistic: 'sum',
            distance: 1,
            units: 'miles',
            description: "Method of commute (2006-2010 ACS 5-yr estimate)",
            dataURL: 'censusACSURL',
            data: [
                {field: 'B08301_003E', label: 'Drove Alone', category: 'Private Vehicle'},
				{field: 'B08301_004E', label: 'Carpooled', category: 'Private Vehicle'},
				{field: 'B08301_011E', label: 'Bus', category: 'Public Transit'},
				{field: 'B08301_012E', label: 'Streetcar', category: 'Public Transit'},
				{field: 'B08301_013E', label: 'Subway/El', category: 'Public Transit'},
				{field: 'B08301_014E', label: 'Commuter Rail', category: 'Public Transit'},
				{field: 'B08301_015E', label: 'Ferry', category: 'Public Transit'},
				{field: 'B08301_016E', label: 'Taxi', category: 'Public Transit'},
				{field: 'B08301_017E', label: 'Motorcycle', category: 'Private Vehicle'},
				{field: 'B08301_018E', label: 'Bicycle', category: 'Self-Propelled'},
				{field: 'B08301_019E', label: 'Walked', category: 'Self-Propelled'},
				{field: 'B08301_021E', label: 'Worked at Home', category: 'No Travel'},
				{field: 'B08301_020E', label: 'Other', category: 'Other'}
            ]
        },
        {
            title: "O hallowed halls and vine draped walls...",
            type: "stackedBar",
            statistic: 'sum',
            distance: 1,
            units: 'miles',
            colors: ['#01DF01', '#58FA58', '#BCF5A9'],
            description: "School Enrollment by Race (2006 - 2010 Census ACS)",
            dataURL: 'censusACSURL',
            data: [
                {field: 'C14007A_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'White'},
				{field: 'C14007A_004E', label: 'Enrolled in grade 1 to grade 8', category: 'White'},
				{field: 'C14007A_005E', label: 'Enrolled in grade 9 to grade 12', category: 'White'},
				{field: 'C14007B_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'African Am.'},
				{field: 'C14007B_004E', label: 'Enrolled in grade 1 to grade 8', category: 'African Am.'},
				{field: 'C14007B_005E', label: 'Enrolled in grade 9 to grade 12', category: 'African Am.'},
				{field: 'C14007C_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'Native Am.'},
				{field: 'C14007C_004E', label: 'Enrolled in grade 1 to grade 8', category: 'Native Am.'},
				{field: 'C14007C_005E', label: 'Enrolled in grade 9 to grade 12', category: 'Native Am.'},
				{field: 'C14007D_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'Asian'},
				{field: 'C14007D_004E', label: 'Enrolled in grade 1 to grade 8', category: 'Asian'},
				{field: 'C14007D_005E', label: 'Enrolled in grade 9 to grade 12', category: 'Asian'},
				{field: 'C14007E_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'Pacific Is.'},
				{field: 'C14007E_004E', label: 'Enrolled in grade 1 to grade 8', category: 'Pacific Is.'},
				{field: 'C14007E_005E', label: 'Enrolled in grade 9 to grade 12', category: 'Pacific Is.'},
				{field: 'C14007F_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'Other'},
				{field: 'C14007F_004E', label: 'Enrolled in grade 1 to grade 8', category: 'Other'},
				{field: 'C14007F_005E', label: 'Enrolled in grade 9 to grade 12', category: 'Other'},
				{field: 'C14007G_003E', label: 'Enrolled in nursery school, preschool, kindergarten', category: 'Multi-Racial'},
				{field: 'C14007G_004E', label: 'Enrolled in grade 1 to grade 8', category: 'Multi-Racial'},
				{field: 'C14007G_005E', label: 'Enrolled in grade 9 to grade 12', category: 'Multi-Racial'}
            ]
        }
    ]
};