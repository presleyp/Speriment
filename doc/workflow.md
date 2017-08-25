### How do I run an experiment?
You'll still need to follow all of the [instructions for using PsiTurk](psiturk.readthedocs.org).

But this is what the workflow will look like in your terminal:

1. Install PsiTurk and the Python component of Speriment. This only has to be done once, whereas future steps are done once per experiment.
Another one-time installation you may want to consider is of a database like MySQL, as the database PsiTurk uses by default may lead to corrupt data
if multiple participants try to submit data at once. See the PsiTurk documentation.

    `sudo pip install psiturk`

    `sudo pip install speriment`

2. Make a project directory for this experiment. In this case I'm calling it `myproject`.

    `psiturk-setup-example`

    `mv psiturk-example/ myproject/`

3. Edit your [configuration files](http://psiturk.readthedocs.org/en/latest/configuration.html) and the following files in `templates`:
    - [ad.html](http://psiturk.readthedocs.org/en/latest/file_desc/ad_html.html)
    - [complete.html](http://psiturk.readthedocs.org/en/latest/file_desc/complete_html.html)
    - [consent.html](http://psiturk.readthedocs.org/en/latest/file_desc/consent_html.html)
    - [default.html](http://psiturk.readthedocs.org/en/latest/file_desc/default_html.html)
    - [error.html](http://psiturk.readthedocs.org/en/latest/file_desc/error_html.html)

    Note that [exp.html](http://psiturk.readthedocs.org/en/latest/file_desc/exp_html.html) is required for PsiTurk, but you should not edit it, because Speriment does so automatically. Speriment also automatically edits `static/task.js`, so do not delete it.

4. Write a Python script to generate a Speriment from a csv of your experimental
materials. Put the csv file and the Python script in `myproject` (or whatever
you called the directory).

5. Install the JavaScript component of Speriment.

    `cd ~/myproject/static/lib`

    `npm install speriment`

6. Run your Python script. It's important to do this after installing Speriment. If you accidentally do it in the wrong order, you can always rerun the script.

    `cd ~/myproject`

    `python myscript`

7. Enter the PsiTurk shell. If you're using a MySQL database, start its server first with `mysql.server start`.

    `psiturk`

8. In the PsiTurk shell, turn on the server and, if you're using a tunnel, open a tunnel.

    `server on`

    `tunnel open`

9. Debug your experiment in your browser.

    `debug`

10. Try out your experiment in the Mechanical Turk Sandbox. This command will ask you questions and then give you two links; follow the Sandbox link.

    `hit create`

11. When you're ready, switch to live mode and make a HIT to put on the real Mechanical Turk.

    `mode`

    `hit create`

    The PsiTurk shell also has other useful commands, so check out its documentation.

12. Check on your experiment as it's running with PsiTurk commands like `hit list` and `worker list.` When the HIT is reviewable, you can run `worker approve` to pay workers.

13. Finally, use Speriment to retrieve and format your data, writing it to a
    csv in your project directory that you can load into Python or R. Speriment
    comes with a command-line tool `speriment-output` to make this easy. It
    takes one required argument and one optional list of arguments. The required argument is
    the name of a file to write the results to. The optional one is --exclude
    or -e.  It should be used if you know already that you want to exclude data
    from certain workers. You can exclude them after looking at the data, so
    this is just a convenience. Follow the flag with the worker IDs of the
    workers you want to exclude.

    Here, I'm imagining I want to exclude the data that I generated
    when I was debugging the experiment and was given worker ID debugALHLUO.

    `speriment-output myproject_results.csv -e debugALHLUO`


