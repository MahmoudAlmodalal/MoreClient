"""Excel (.xlsx) text extraction via pandas and openpyxl."""

import io
import pandas as pd


def extract_xlsx(data: bytes) -> str:
    """Extract text from an Excel file (.xlsx) by converting all sheets to CSV text."""
    excel_file = io.BytesIO(data)
    
    # Read all sheets into a dict of DataFrames
    try:
        sheets = pd.read_excel(excel_file, sheet_name=None, engine="openpyxl")
    except Exception as e:
        # If openpyxl fails, we can't extract text
        raise ValueError(f"Failed to parse Excel file: {e}") from e
    
    output = []
    for sheet_name, df in sheets.items():
        output.append(f"--- Sheet: {sheet_name} ---")
        # Convert DataFrame to a string (CSV format without index)
        # We use tab separator to make it easily readable for the LLM
        output.append(df.to_csv(index=False, sep="\t"))
        output.append("\n")
        
    return "\n".join(output).strip()
