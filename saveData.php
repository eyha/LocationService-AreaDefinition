<!-- Saves the shapes to file -->
$type = $_POST['geometry']['type'];
$coords = array($_POST['coordinates']);

if($type == "Point"){
	$query = "INSERT INTO Markers (Lat, Lng) VALUES ($coords[0], $coords[1])";
	mysqli_query($query);
}
else if($type == "Circle") {
	$query = "INSERT INTO Circles (Lat, Lng) VALUES ($coords[0], $coords[1])";
	mysqli_query($query);
}
else if($type == "Polygon") {
	<!-- need to generate a random number for the shape's id so that all the polygon's points have an identifier -->
	<!-- iterate over the coords, jumping 2 at a time (latitude and longitude) -->
	do
	{
		$query = "INSERT INTO Polygons (Shape_ID, Lat, Lng) VALUES ($coords[0], $coords[1])";
		mysqli_query($query);
	} while()
}