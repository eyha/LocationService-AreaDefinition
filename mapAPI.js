var map, ajaxRequest, plotlist, mouseState;
var plotlayers = [];
//Defines the bounds for the different locations
var areas = [
	[52.987, -1.166, 52.994, -1.149],
	[52.940, -1.189, 52.947, -1.180]
];
//saves the locations of the shapes into the database
var shapes = [[]];
var loc = 0;
var points = [];
var currentShape = [];
var corners, lines;
var markers, polygons;
var currentSelected;
var currentMarkerPosition;
var currentLines = [];

//Initiates the map
var initMap = function() 
{
	map = L.map('map');
	//Current state affect how mouse clicks on the map work
	mouseState = 0;

	//setting attributes for the map
	var url = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var attributes = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
	var osm = new L.tileLayer(url, 
	{
		minZoom: 15, maxZoom: 19, 
		attribution: attributes
	});
	
	//creating bounds for the map
	var southwest = L.latLng(areas[loc][0], areas[loc][1]);
	var northeast = L.latLng(areas[loc][2], areas[loc][3]);
	var bounds = L.latLngBounds(southwest, northeast);
	
	//defining the various groups
	corners = L.featureGroup();
	lines = L.layerGroup();
	markers = L.layerGroup();
	polygons = L.layerGroup();

	// map.setView(new L.LatLng(52.9912, -1.1579), 16);
	map.addLayer(osm);
	map.fitBounds(bounds);
	map.setMaxBounds(bounds);
	map.on('click', mapClick);
	corners.addTo(map);
	lines.addTo(map);
	polygons.addTo(map);
	markers.addTo(map);
}

var addPoint = function(location) {
	var point = new L.latLng(location.lat, location.lng);
	var marker = new L.marker(location, {draggable: true});
	var newArr = [];

	//functions for markers
	marker.on('click', cutPoint);
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);

	if(mouseState !== 4)
		corners.addLayer(marker);
	else
		markers.addLayer(marker);
	points.push(point);
	//add point to array of polygon's current corners
	currentShape.push(point);
}

var drawLine = function(point1, point2) {
	var points = [point1, point2];
	var line = new L.Polyline(points, 
	{
		color: 'black',
		weight: 2,
		opacity: 0.5,
		smoothfactor: 1
	});
	lines.addLayer(line);
}

var mapClick = function(e) {
	switch(mouseState){
	case 0:
		break;
	//Adding a point
	case 1:
		addPoint(e.latlng);
		mouseState = 2;
		break;
	//In shape polygon defining mode.
	case 2:
		//Drawing a line between point selected and previous one
		drawLine(e.latlng, points[points.length - 1]);
		addPoint(e.latlng);
		break;
	case 3:
		//Deselecting the current selected shape
		corners.clearLayers();
		polygons.getLayer(currentSelected).setStyle({fillColor: 'blue'});
		break;
	//Adding a point
	case 4:
		addPoint(e.latlng);
		shapes.push(currentShape);
		currentShape = [];
		mouseState = 0;
		break;
	//Defining the start point of a circle
	case 5:
		mouseState = 6;
		break;
	//Defining the radius of the circle 
	case 6:
		break;
	default:
		break;
	}
	return;
}

var cutPoint = function(e) {
	switch(mouseState){
	case 0:
		break;
	case 1:
		mouseState = 0;
		break;
	case 2:
		mouseState = 0;
		var polygon = L.polygon(currentShape);
		shapes.push(currentShape);
		currentShape = [];
		corners.clearLayers();
		lines.clearLayers();
		polygon.on('click', selectPolygon);
		polygon.addTo(polygons);
		break;
	default:
		break;
	}
}

var drawPolygon = function() {
	mouseState = 1;
}

var drawPoint = function() {
	mouseState = 4;
}

var drawCircle = function() {
	mouseState = 5;
}

var selectPolygon = function(polygon) {
	//reset if previous shape had been selected
	if(currentSelected !== undefined)
		polygons.getLayer(currentSelected).setStyle({fillColor: 'blue'});
	corners.clearLayers();
	polygon.target.setStyle({fillColor: 'yellow'});
	//Create a marker at each one of the polygon's points
	var p, marker;
	var position = polygon.target._latlngs;
	for(p = 0; p < position.length; p++)
	{
		marker = new L.marker(position[p], {draggable: true});
		marker.on('dragstart', recordPosition);
		marker.on('dragend', setPosition);
		corners.addLayer(marker);
	}
	currentSelected = polygon.target._leaflet_id;
	mouseState = 3;
}

var recordPosition = function(element) {
	switch(mouseState)
	{
	case 2:
		break;
	case 3:
		currentMarkerPosition = element.target.getLatLng();
		break;
	default:
		break;
	}
}

var setPosition = function(element) {
	switch(mouseState)
	{	
	//Drawing lines mode
	case 2:
		//Get attached to 
		break;
	//Shape selected
	case 3:
		//Redraw the shape to match it's new coordinates
		var polygon = polygons.getLayer(currentSelected);
		var points = polygon.getLatLngs();
		var p;
		for(p = 0; p < points.length; p++)
		{
			if(points[p] == currentMarkerPosition)
			{
				points[p] = element.target.getLatLng();
				break;
			}
		}
		polygon.setLatLngs(points);
		break;
	default:
		break;
	}
}