import re

def extract_fields(text):
    try:
        disease = re.search(r'(COVID-19|H1N1|Nipah|Avian Flu)', text).group()
    except:
        disease = None
    try:
        result = re.search(r'(Detected|Not Detected)', text).group()
    except:
        result = None
    try:
        ct_value = re.search(r'Ct value[:\s]+(\d+\.?\d*)', text)
        ct_value = float(ct_value.group(1)) if ct_value else None
    except:
        ct_value = None

    return {
        "Disease": disease,
        "Result": result,
        "Ct_Value": ct_value
    }
