import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)

# Load analysis results
df = pd.read_csv('data/analysis_results.csv')

# Define level order (from simple to complex)
level_order = [
    'elementary school student (8-10 years old)',
    'middle school student (13-14 years old)',
    'college freshman (18-19 years old)',
    'expert researcher in the field'
]

# Create figure with subplots
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('LLM Explanation Analysis: Complexity Across Student Levels', fontsize=16, fontweight='bold')

# ============================================================================
# Plot 1: Readability by Student Level
# ============================================================================
ax1 = axes[0, 0]
readability_data = df.groupby('student_level')['flesch_kincaid'].mean().reindex(level_order)
bars1 = ax1.bar(range(len(readability_data)), readability_data.values, 
                color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c'])
ax1.set_xticks(range(len(readability_data)))
ax1.set_xticklabels(['Elementary', 'Middle', 'College', 'Expert'], fontsize=10)
ax1.set_ylabel('Flesch-Kincaid Grade Level', fontsize=11, fontweight='bold')
ax1.set_title('Readability Complexity', fontsize=12, fontweight='bold')
ax1.set_ylim(0, 16)

for i, (bar, val) in enumerate(zip(bars1, readability_data.values)):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.2, f'{val:.1f}', 
             ha='center', va='bottom', fontweight='bold', fontsize=10)

# ============================================================================
# Plot 2: Word Count & Sentence Count
# ============================================================================
ax2 = axes[0, 1]
word_count = df.groupby('student_level')['word_count'].mean().reindex(level_order)
sentence_count = df.groupby('student_level')['sentence_count'].mean().reindex(level_order)

x = range(len(word_count))
width = 0.35

bars2a = ax2.bar([i - width/2 for i in x], word_count.values, width, 
                 label='Avg Words', color='#3498db', alpha=0.8)
bars2b = ax2.bar([i + width/2 for i in x], sentence_count.values * 15, width, 
                 label='Avg Sentences (×15)', color='#2ecc71', alpha=0.8)

ax2.set_xticks(x)
ax2.set_xticklabels(['Elementary', 'Middle', 'College', 'Expert'], fontsize=10)
ax2.set_ylabel('Count', fontsize=11, fontweight='bold')
ax2.set_title('Structure: Word Count & Sentence Count', fontsize=12, fontweight='bold')
ax2.legend(fontsize=9)
ax2.set_ylim(0, 70)

# ============================================================================
# Plot 3: Analogies & Examples Usage
# ============================================================================
ax3 = axes[1, 0]
analogies = df.groupby('student_level')['analogy_count'].mean().reindex(level_order)
examples = df.groupby('student_level')['example_count'].mean().reindex(level_order)

x = range(len(analogies))
width = 0.35

bars3a = ax3.bar([i - width/2 for i in x], analogies.values, width, 
                 label='Analogies', color='#9b59b6', alpha=0.8)
bars3b = ax3.bar([i + width/2 for i in x], examples.values, width, 
                 label='Examples', color='#e67e22', alpha=0.8)

ax3.set_xticks(x)
ax3.set_xticklabels(['Elementary', 'Middle', 'College', 'Expert'], fontsize=10)
ax3.set_ylabel('Average Count per Explanation', fontsize=11, fontweight='bold')
ax3.set_title('Teaching Strategies: Analogies vs Examples', fontsize=12, fontweight='bold')
ax3.legend(fontsize=9)
ax3.set_ylim(0, 1.5)

for bars in [bars3a, bars3b]:
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax3.text(bar.get_x() + bar.get_width()/2., height + 0.03,
                    f'{height:.2f}', ha='center', va='bottom', fontsize=8)

# ============================================================================
# Plot 4: Vocabulary Analysis
# ============================================================================
ax4 = axes[1, 1]
unique_words = df.groupby('student_level')['unique_words'].mean().reindex(level_order)

x = range(len(unique_words))
bars4 = ax4.bar(x, unique_words.values, color=['#1abc9c', '#16a085', '#0984e3', '#34495e'], alpha=0.8)

ax4.set_xticks(x)
ax4.set_xticklabels(['Elementary', 'Middle', 'College', 'Expert'], fontsize=10)
ax4.set_ylabel('Average Unique Words', fontsize=11, fontweight='bold')
ax4.set_title('Vocabulary: Unique Words Count', fontsize=12, fontweight='bold')
ax4.set_ylim(0, 50)

for bar in bars4:
    height = bar.get_height()
    ax4.text(bar.get_x() + bar.get_width()/2., height + 0.5,
            f'{height:.1f}', ha='center', va='bottom', fontweight='bold', fontsize=10)

plt.tight_layout()
plt.savefig('analysis/complexity_visualization.png', dpi=300, bbox_inches='tight')
print("✅ Visualization saved to analysis/complexity_visualization.png")

# ============================================================================
# Concept-Level Heatmap
# ============================================================================
fig2, ax = plt.subplots(figsize=(10, 6))

# Create pivot table: concepts × levels with readability
heatmap_data = df.pivot_table(
    values='flesch_kincaid',
    index='concept',
    columns='student_level',
    aggfunc='mean'
)[level_order]

# Create heatmap
sns.heatmap(heatmap_data, annot=True, fmt='.1f', cmap='RdYlGn_r', 
            cbar_kws={'label': 'Flesch-Kincaid Grade Level'}, ax=ax, linewidths=0.5)
ax.set_title('Readability by Concept and Student Level', fontsize=13, fontweight='bold', pad=20)
ax.set_xlabel('Student Level', fontsize=11, fontweight='bold')
ax.set_ylabel('Concept', fontsize=11, fontweight='bold')
ax.set_xticklabels(['Elementary', 'Middle', 'College', 'Expert'], rotation=45, ha='right')

plt.tight_layout()
plt.savefig('analysis/concept_heatmap.png', dpi=300, bbox_inches='tight')
print("✅ Heatmap saved to analysis/concept_heatmap.png")

print("\n" + "=" * 80)
print("✅ All visualizations created successfully!")
print("=" * 80)
