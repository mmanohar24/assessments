import json
import pandas as pd
import textstat
import nltk
from collections import Counter
import re

# Download required NLTK data
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)

# Load responses
with open('data/responses.json', 'r') as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data)

print("=" * 80)
print("COMPLEXITY ANALYSIS")
print("=" * 80)

# ============================================================================
# 1. READABILITY METRICS
# ============================================================================

print("\n1. READABILITY ANALYSIS (Flesch-Kincaid Grade Level)")
print("-" * 80)

df['flesch_kincaid'] = df['explanation'].apply(
    lambda x: textstat.flesch_kincaid_grade(x)
)

# Group by student level and show average readability
readability_by_level = df.groupby('student_level')['flesch_kincaid'].agg(['mean', 'min', 'max', 'std'])
print(readability_by_level.round(2))

print("\nReadability by concept:")
readability_by_concept = df.groupby('concept')['flesch_kincaid'].agg(['mean', 'min', 'max', 'std'])
print(readability_by_concept.round(2))

# ============================================================================
# 2. STRUCTURAL METRICS
# ============================================================================

print("\n2. STRUCTURAL ANALYSIS")
print("-" * 80)

df['sentence_count'] = df['explanation'].apply(lambda x: len(nltk.sent_tokenize(x)))
df['avg_sentence_length'] = df['explanation'].apply(
    lambda x: sum(len(s.split()) for s in nltk.sent_tokenize(x)) / len(nltk.sent_tokenize(x))
)
df['word_count'] = df['explanation'].apply(lambda x: len(x.split()))

print("\nSentence count by student level:")
print(df.groupby('student_level')['sentence_count'].agg(['mean', 'min', 'max']).round(2))

print("\nAverage sentence length by student level:")
print(df.groupby('student_level')['avg_sentence_length'].agg(['mean', 'min', 'max']).round(2))

# ============================================================================
# 3. VOCABULARY METRICS
# ============================================================================

print("\n3. VOCABULARY ANALYSIS")
print("-" * 80)

df['unique_words'] = df['explanation'].apply(lambda x: len(set(x.lower().split())))
df['vocabulary_richness'] = df['explanation'].apply(
    lambda x: len(set(x.lower().split())) / len(x.split()) if len(x.split()) > 0 else 0
)

print("\nUnique words by student level:")
print(df.groupby('student_level')['unique_words'].agg(['mean', 'min', 'max']).round(2))

print("\nVocabulary richness (unique/total words) by student level:")
print(df.groupby('student_level')['vocabulary_richness'].agg(['mean', 'min', 'max']).round(3))

# ============================================================================
# 4. ANALOGY & METAPHOR DETECTION
# ============================================================================

print("\n4. ANALOGY & METAPHOR DETECTION")
print("-" * 80)

analogy_keywords = ['like', 'similar', 'imagine', 'think of', 'as if', 'compared to', 'analogous']

def count_analogies(text):
    """Count analogy/metaphor phrases."""
    text_lower = text.lower()
    count = sum(1 for keyword in analogy_keywords if keyword in text_lower)
    return count

df['analogy_count'] = df['explanation'].apply(count_analogies)

print("\nAnalogy usage by student level:")
analogy_by_level = df.groupby('student_level')['analogy_count'].agg(['sum', 'mean', 'max'])
print(analogy_by_level.round(2))

# ============================================================================
# 5. EXAMPLES & CONCRETE LANGUAGE
# ============================================================================

print("\n5. CONCRETE EXAMPLES")
print("-" * 80)

example_keywords = ['example', 'such as', 'for instance', 'like when', 'imagine', 'picture']

def count_examples(text):
    """Count example indicators."""
    text_lower = text.lower()
    count = sum(1 for keyword in example_keywords if keyword in text_lower)
    return count

df['example_count'] = df['explanation'].apply(count_examples)

print("\nExample usage by student level:")
example_by_level = df.groupby('student_level')['example_count'].agg(['sum', 'mean', 'max'])
print(example_by_level.round(2))

# ============================================================================
# 6. SUMMARY STATISTICS
# ============================================================================

print("\n6. SUMMARY TABLE BY STUDENT LEVEL")
print("-" * 80)

summary = df.groupby('student_level').agg({
    'flesch_kincaid': 'mean',
    'word_count': 'mean',
    'sentence_count': 'mean',
    'avg_sentence_length': 'mean',
    'unique_words': 'mean',
    'analogy_count': 'mean',
    'example_count': 'mean'
}).round(2)

summary.columns = ['Readability', 'Words', 'Sentences', 'Avg Sent Length', 'Unique Words', 'Analogies', 'Examples']
print(summary)

# ============================================================================
# 7. SAVE ANALYSIS TO CSV
# ============================================================================

output_df = df[[
    'concept', 'student_level', 'word_count', 'sentence_count', 
    'flesch_kincaid', 'unique_words', 'analogy_count', 'example_count'
]].copy()

output_df.to_csv('data/analysis_results.csv', index=False)
print("\n✅ Analysis results saved to data/analysis_results.csv")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
