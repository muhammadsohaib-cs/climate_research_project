import pandas as pd

try:
    print("Loading excel file first 5 rows...")
    df = pd.read_excel('journal.pone.0271626.s001.xlsx', header=None, nrows=5)
    for i in range(5):
        print(f"Row {i}: {list(df.iloc[i])}")
except Exception as e:
    print("Error:", e)
