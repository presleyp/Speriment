/* Remember to import speriment.js and your JSON file in exp.html.
 * Change the variable assigned to jsonExperiment below to your experiment's variable name.
 */

/*******************
 * Run Task
 ******************/
$(document).ready(function(){
	var jsonExperiment = my_exp;
	var psiturk = PsiTurk(uniqueId, adServerLoc);
	psiturk.finishInstructions();
	var experiment = new Experiment(jsonExperiment, condition, psiturk);
	experiment.start();
});

// vi: noexpandtab tabstop=4 shiftwidth=4
