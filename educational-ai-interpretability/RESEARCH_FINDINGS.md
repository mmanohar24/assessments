# Understanding How LLMs Explain Concepts to Different Audiences

## What I Was Curious About

I've noticed that when I ask ChatGPT to explain something "for a 10-year-old" versus "for a researcher," the explanations are actually different. But I wasn't sure *how* different, or what strategies the model actually uses. Does it just swap out fancy words? Does it use simpler sentence structures? Does it rely on analogies? I wanted to find out.

So I ran a small experiment: I took 5 concepts ranging from biology to computer science, and asked GPT-3.5-turbo to explain each one at 4 different knowledge levels. Then I analyzed them—looking at readability, sentence structure, vocabulary, and whether it uses analogies or concrete examples.

**What I found:** The model is more sophisticated than I expected. It's not just swapping vocabulary. It's making coordinated changes across multiple dimensions, and in some ways that's clever, in other ways it reveals real limitations.

---

## The Setup

I tested 5 concepts:
- Photosynthesis (biology)
- Recursion (CS)
- Probability (math)
- Entropy (physics)
- Neural Networks (AI)

And 4 audience levels:
- An 8-10 year old
- A 13-14 year old
- A college freshman
- An expert researcher

That's 20 explanations total. For each one, I measured:
- **Readability** (Flesch-Kincaid grade level—higher = harder to read)
- **Structure** (how many sentences, how many words)
- **Vocabulary** (how many unique words)
- **Teaching strategies** (does it use analogies? Examples?)

---

## What I Actually Found

### 1. Readability Scales Predictably

The big headline: readability increases consistently as the audience gets smarter.

- Elementary: 7.17 grade level (like 7th grade reading)
- Middle school: 7.92
- College: 10.33
- Expert: 12.98

It's a smooth progression. That tells me the model isn't randomly adjusting complexity—it's calibrating intentionally based on who it thinks is reading.

### 2. Some Concepts Are Harder to Simplify Than Others

Here's something interesting. Some concepts scale easily, others don't.

- **Probability** is the easiest. It goes from 6.5 (elementary) to 10.1 (expert). A small jump. That makes sense—probability is fundamentally about odds, which even kids understand.
- **Photosynthesis** is a nightmare. Elementary: 6.1. Expert: 16.1. A 10-point gap. That's because an expert explanation involves chlorophyll, electron transport chains, ATP—things that don't exist in the simple version.
- **Recursion** sits in the middle. Always kind of complex because you can't really talk about self-referential functions without some CS knowledge.

The model doesn't arbitrarily simplify. It preserves what matters while cutting the technical depth. That's actually thoughtful.

### 3. It Keeps Explanations Short No Matter What

Here's where it gets interesting. The model uses about 2.6 sentences at *every* level. 

Elementary: 2.6 sentences. Expert: 2.4 sentences. Basically the same.

So it's not breaking complex ideas into smaller chunks. Instead, it's putting more complexity into each sentence. Elementary explanations use shorter words and simpler grammar. Expert explanations use longer words, more clauses, denser packing.

**Why this matters:** Brief explanations are easy to digest, but they limit how much you can explain. You can't fit a worked example into 2 sentences. You have to choose: depth or pedagogy.

### 4. It Uses Analogies for Young Students, Precision for Experts

This one was really clear in the data:

- Elementary: 1.2 analogies per explanation
- Middle school: 1.2 analogies per explanation
- College: 1.0 analogies
- Expert: 0.4 analogies

Young students get analogies ("like nesting dolls," "imagine..."). Experts get definitions.

It makes sense. Analogies work by connecting new concepts to familiar ones. Experts don't need that scaffolding. They want accuracy.

### 5. Concrete Examples Are Almost Absent

This surprised me. Only 7 examples across 20 explanations (0.35 per explanation). Most of them in middle school explanations.

The 2-3 sentence limit probably explains this. You can't say "Recursion: when a function calls itself. For example..." and actually finish the example in 2 sentences. So the model just skips it.

If you asked for longer explanations, I bet examples would appear a lot more.

### 6. Vocabulary Variety Stays High Everywhere

The model doesn't simplify by repeating words. A simple explanation of photosynthesis uses just as many *different* words as a complex one.

What changes is which words. Simple: "plant," "sunlight," "food." Complex: "photon," "chlorophyll," "ATP," "electron transport."

---

## What This Actually Tells Us

### The Model Has a Sense of Complexity

The model isn't following a rule book. It seems to have internalized what "simple" and "complex" mean for different audiences. When you say "explain this to a 10-year-old," it doesn't just look up a vocabulary list. It makes coordinated changes—easier words, shorter clauses, more analogies.

That's not trivial. It means the model understands something about pedagogy.

### But There Are Real Trade-offs

The brevity constraint is a real limitation. A 2-3 sentence explanation can't include examples, can't build intuition step-by-step. It has to choose: precision or pedagogy.

For some topics (probability), that's fine. For others (photosynthesis), it feels rushed.

### Expert Explanations Aren't Always Better

Here's something I didn't expect: expert explanations sometimes reuse technical terms instead of finding new vocabulary. That's actually smart (precision matters), but it's a choice—and not always the best one for learning.

---

## Why This Matters

The biggest takeaway: **the model didn't just memorize simplification rules. It learned something about communication.**

When you ask it to explain for a 10-year-old, it doesn't consult a vocabulary list. It makes intelligent trade-offs. Analogies for intuition. Shorter sentences for comprehension. Technical precision for experts.

That's more than pattern matching. That's an understanding of how people learn.

But it also has real limits. The brevity constraint means it has to choose between depth and pedagogy. For some topics, that's fine. For others, it feels incomplete.

And the fact that these strategies work *at all* is interesting from an AI perspective. It suggests that language models have internalized principles about communication—not because we programmed them, but because they trained on thousands of human explanations where these patterns emerge.

---

## What I'm Uncertain About

This is a small study. 20 explanations across 5 concepts. That's enough to see patterns, not enough to generalize confidently.

I don't know if these strategies would hold up for:
- Different models (GPT-4, Claude, open-source ones)
- Longer explanations (would examples appear more?)
- Other domains (would biology behave like CS?)
- Concepts with different inherent complexity

Also, I measured structure, not actual learning. These explanations *sound* like they scale complexity, but I didn't test whether they actually help students learn. That would require a different experiment.

---

## What's Next

If I were to continue this work, I'd want to:

1. **Test more concepts.** 5 is a start. 20+ would give me real confidence in the patterns.
2. **Compare models.** Does GPT-4 use the same strategies? What about open-source models?
3. **Measure learning outcomes.** Do these explanations actually help students understand concepts better?
4. **Allow longer responses.** What happens when you remove the 2-3 sentence constraint?
5. **Look at semantics, not just structure.** Use embeddings to see how conceptually different the explanations actually are.

---

## Conclusion

Language models are smarter about explanation than I realized. They don't just swap vocabulary—they make coordinated, thoughtful changes across multiple dimensions.

But they also hit real constraints. The trade-off between brevity and depth is real. Some concepts are genuinely hard to simplify without losing important details.

The fact that these strategies work suggests language models have internalized something real about communication and pedagogy. Whether that's "understanding" in any meaningful sense is a separate question. But it's a better starting point than I expected.

---

## Data & Tools

- **Analysis:** Python (Pandas, Textstat, NLTK, Matplotlib, Seaborn)
- **Model:** GPT-3.5-turbo 
- **Data:** Available at https://github.com/mmanohar24/educational-ai-interpretability