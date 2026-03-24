"""
Dummy training data for the ML content moderator to initialize successfully.
"""

TRAINING_DATA = [
    ("This is a wonderful and beautiful post about technology.", "appropriate"),
    ("I love learning new things and sharing them.", "appropriate"),
    ("This is terrible and I hate it.", "inappropriate"),
    ("Kill everyone this is a hit list.", "inappropriate"),
    ("You are an idiot and a fool.", "inappropriate"),
    ("Have a great day and enjoy the weather!", "appropriate"),
    ("Violence is the only answer, destroy them all.", "inappropriate"),
    ("A comprehensive guide to React hooks.", "appropriate"),
]
