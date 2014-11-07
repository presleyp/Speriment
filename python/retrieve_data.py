from sqlalchemy import create_engine, MetaData, Table
import json
import pandas as pd

def retrieve(db_url, table_name, exclude = []):
    # db_url = "mysql://username:password@host.org/database_name"
    # table_name = 'my_experiment_table'
    data_column_name = 'datastring'
    # boilerplace sqlalchemy setup
    engine = create_engine(db_url)
    metadata = MetaData()
    metadata.bind = engine
    table = Table(table_name, metadata, autoload=True)
    # make a query and loop through
    s = table.select()
    rows = s.execute()

    #status codes of subjects who completed experiment
    statuses = [3,4,5,7]

    #column to retrieve
    data_column_name = 'datastring'

    # filter participants
    data = [participant[data_column_name] for participant in rows
            if participant['status'] in statuses
            and participant['uniqueid'] not in exclude]
    return data

def format(data, user_defined_columns):
    # parse each participant's datastring as json object
    participants = [json.loads(participant) for participant in data]

    # push important information into 'trialdata' subobjects
    for participant in participants:
        for trial in participant['data']:
            trial['trialdata'].append(trial['uniqueid'])
            trial['trialdata'].append(trial['current_trial'])
            trial['trialdata'].append(participant['condition'])
            trial['trialdata'].append(participant['hitId'])
            trial['trialdata'].append(participant['workerId'])

    # extract just trialdata objects
    trials = [trial['trialdata']
            for participant in participants
            for trial in participant['data']]

    column_names = [
        'PageID',
        'PageText',
        'BlockIDs',
        'StartTime',
        'EndTime',
        'Iteration',
        'Condition',
        'SelectedID',
        'SelectedText',
        'Correct',
        'OptionOrder',
        'SelectedPosition',
        'UniqueID',
        'TrialNumber',
        'Version',
        'HIT',
        'WorkerID',
    ] + user_defined_columns

    data_frame = pd.DataFrame(trials, columns = column_names)
    data_frame['ReactionTime'] = data_frame['EndTime'] - data_frame['StartTime']
    return data_frame

if __name__ == '__main__':
    # usage: python retrieve_data db_url table_name filename user_defined_columns exclude
    db_url = sys.argv[1]
    table_name = sys.argv[2]
    filename = sys.argv[3]
    user_defined_columns = []
    if len(sys.argv) > 4:
        user_defined_columns = sys.argv[4]
    exclude = []
    if len(sys.argv) > 5:
        exclude = sys.argv[5]

    data = retrieve(db_url, table_name, exclude)
    formatted = format_data(data, user_defined_columns)
    formatted.to_csv(filename)
