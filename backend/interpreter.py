def generate_advice(fields):
    disease = fields['Disease']
    result = fields['Result']
    ct_value = fields['Ct_Value']

    if result == 'Detected':
        advice = f"{disease} detected. This is a zoonotic virus. "
        if ct_value and ct_value < 30:
            advice += f"Ct value {ct_value} indicates high viral load. "
        advice += "Please isolate and consult a doctor immediately."
    elif result == 'Not Detected':
        advice = f"{disease} not detected. No infection detected, but monitor symptoms."
    else:
        advice = "Could not extract proper results from report."

    return advice
