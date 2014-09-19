<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="Leaflet/leaflet.css"></link>
		<link rel="stylesheet" href="mapAPI.css"></link>
		<script type="text/javascript" src="jquery.js"></script>
		<script type="text/javascript" src="Leaflet/leaflet.js"></script>
		<script type="text/javascript" src="Leaflet/leaflet-pip.min.js"></script>
		<!-- <script type="text/javascript" src="Leaflet/leaflet-geometry-util.js"></script> -->
		<script type="text/javascript" src="mapAPI.js"></script>
		<title>Location Services</title>
	</head>
	<body onload="initMap()">
		<div class="header">
			<h1>Location service</h1>
		</div>
		<div id="map" name="map"></div>
		<button onclick="definePolygon()">Draw a shape</button>
		<button onclick="definePoint()">Draw a point</button>
		<button onclick="defineCircle()">Draw a circle</button>
		<button onclick="saveData()">Save your progress</button>
		<!-- Connects to the database and retrieves all previous stored data, converts to GeoJSON, and passes it to parse function-->
		<?php
			$conn = mysqli_connect(/*database connection info*/);
			if(!$conn)
			{
				die("Error connecting to MySQL: " . mysqli_error());
			}
			$success = mysqli_select_db(/*Database name*/, $conn);

			if(!$success)
			{
				die("Error selecting database" . mysqli_error());
			}

			$query = "SELECT 'Coords' FROM 'Markers'";
			$success = mysqli_query($query);
			$row = mysqli_fetch_array($result);
			while($row = mysqli_fetch_array($result))
			{
				//for each value found, assemble a JSON for it
				echo "<script>\n";
				echo "var parseData = ";
				echo json_encode(utf8_encode($row));
				echo "\nparseLoadData('marker', parseData);\n";
				echo "</script>";
			}

			$query = "SELECT 'Coords' FROM 'Circles'";
			$success = mysqli_query($query);
			$row = mysqli_fetch_array($result);
			while($row = mysql_fetch_array($result))
			{
				echo "<script>\n";
				echo "var parseData = ";
				echo json_encode(utf8_encode($row));
				echo "\nparseLoadData('circle', parseData);\n";
				echo "</script>";
			}
	
			$query = "SELECT 'Coords' FROM 'Polygons'";
			$success = mysqli_query($query);
			$row = mysqli_fetch_array($result);
			while($row = mysqli_fetch_array($result))
			{
				echo "<script>\n";
				echo "var parseData = ";
				echo json_encode(utf8_encode($row));
				echo "\nparseLoadData('polygon', parseData);\n";
				echo "</script>";
			}
		?>
	</body>
</html> 