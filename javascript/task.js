/* User Steps
 1. Put the JSON file describing your experiment in psiturk/static/js
 2. Set mySperiment to the name of your experiment from the JSON file
 3. Add speriment.js to psiturk/static/lib.
 4. Add 
		<script src="static/lib/speriment.js" type="text/javascript"> </script>
	to the list of static/lib/ scripts in psiturk/templates/exp.html.
*/

var mySperiment = latin_square_experiment;

/*******************
 * Run Task
 ******************/
$(document).ready(function(){
	var psiturk = PsiTurk(uniqueId, adServerLoc);
	psiturk.finishInstructions();
	var speriment = new Survey(mySperiment, condition, psiturk);
	speriment.start();
});

// vi: noexpandtab tabstop=4 shiftwidth=4
