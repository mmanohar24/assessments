import pandas as pd
import plotly.express as px
from preswald import connect, get_df, query, table, text, plotly
from preswald import register_df

#Step 1: Connect and Load
connect()
df = get_df('job_data')

# Step 2: Data Cleaning

df['Average of Base Salary'] = df['Average of Base Salary'].replace('[\$,]', '', regex = True).astype(float)

# Step 3: Register cleaned df to use SQL
from preswald import register_df
register_df(df, 'cleaned_salaries')

# Step 4: Filter jobs with salary > 100,000
sql = ' SELECT * FROM cleaned_salaries WHERE [Average of Base Salary] > 100000'
filtered_df = query(sql, 'cleaned_salaries')

# Step 5: Creating a bar chart
fig = px.bar(
    filtered_df,
    x = 'Position Title',
    y = 'Average of Base Salary',
    title = 'High Paying Job Classifications',
    labels = {'Average of Base Salary': 'Avg Salary ($)'},
    text = 'Average of Base Salary'
)


fig.update_traces(textposition = 'outside', marker = dict(color = 'lightblue'))
fig.update_layout(template = 'plotly_white', xaxis_tickangle = -45)

# Step 6: Displaying UI
text( 'Welcome to the Salary Insights App!')
text( "Here's a quick look at roles earning over $100,000.")
plotly(fig)
table(filtered_df, title = 'Filtered High Paying Roles')