# I Spent Two Weeks Analyzing How ChatGPT Explains Things. Here's What Happened.

I was procrastinating on a bootcamp assignment when I realized something. When I ask ChatGPT "explain photosynthesis," I get one thing. When I ask "explain photosynthesis to a 10-year-old," I get something completely different. But I couldn't actually articulate *what* was different.

That shouldn't have bugged me as much as it did. But it did.

So instead of finishing my assignment, I spent a night thinking about it. And then I started building something. And then I couldn't stop.

## The Actual Question

Here's what I wanted to know: **When an AI adapts an explanation for different audiences, what is it actually doing?**

Is it just swapping out fancy words for simple ones? Does it break things into smaller chunks? Does it use analogies more for kids? Does it give up on examples to keep things short?

I didn't have a good intuition for any of this. So I decided to measure it.

## What I Actually Built

I wrote a Python script that asks GPT-3.5-turbo to explain 5 concepts to 4 different audiences. Dead simple.

The concepts were:
- Photosynthesis
- Recursion
- Probability
- Entropy
- Neural Networks

The audiences were basically:
- 8-year-old
- 13-year-old
- College student
- PhD researcher

That's 20 explanations. Then I analyzed the hell out of them using Textstat (readability), NLTK (word counting), and Pandas (data wrangling). Then I made some charts.

It took about 4 hours of work, spread across a week. Not a huge commitment. But enough to actually see something.

## What I Actually Found

### Readability Scales Like Clockwork

The readability goes: 7.2 → 7.9 → 10.3 → 13.0

That's a smooth progression. The model isn't guessing. It's systematically making explanations harder to read as the audience gets smarter.

When I first saw this I was like—okay, obviously it would do that. But actually, it's not obvious. The model could have just swapped vocabulary and called it a day. Instead, it's making coordinated changes across *multiple dimensions*. The sentence structure gets more complex. The word choices shift. The depth increases.

That's more intentional than I expected.

### Some Concepts Are Actually Hard to Simplify

This blew my mind a little bit.

Probability: 6.5 (elementary) → 10.1 (expert). A 3.6-point jump.

Photosynthesis: 6.1 → 16.1. A 10-point jump.

Why? Because you can explain probability at any level—it's fundamentally about odds, which a kid gets. But photosynthesis has this brutal gap. Simple version: "plants eat sunlight and make food." Expert version: involves electron transport chains, photon energy, ATP, chlorophyll molecules.

The expert explanation isn't just a more complex version of the simple one. It's an entirely different thing.

The model understands this. It doesn't try to bridge the gap with hand-waving. It just... makes the jump.

### Kids Get Analogies. Experts Get Definitions.

This one was clean:
- Kids: 1.2 analogies per explanation
- Experts: 0.4 analogies per explanation

The model uses analogies to help kids build intuition ("imagine...," "like..."). For experts, it drops that scaffolding and just gives you the technical definition.

I mean, it makes total sense when you think about it. But it's neat that the model figured this out without being told.

### The Brevity Trap

Here's the weird part. Every explanation is about 2.6 sentences, no matter who it's for.

So how does it explain photosynthesis to a kid *and* to a researcher in 2-3 sentences each?

By packing more complexity into each sentence. Kids get: short words, simple grammar. Researchers get: long words, complex clauses, nested ideas.

But this creates a real constraint. You literally cannot fit a worked example into 2 sentences. So the model just... doesn't include examples (0.35 per explanation on average).

It's trading pedagogy for brevity. I think that's a real limitation.

## What I Actually Think About This

The thing that got me was realizing the model isn't following a formula. It's not like there's a "simplification rule book" hard-coded somewhere.

The model has learned something about *how people communicate*. Not because anyone taught it that lesson, but because it trained on thousands of human explanations where these patterns naturally emerge.

It knows that talking to a kid is different from talking to an expert. It knows analogies help with intuition. It knows experts want precision. It knows to trade off depth against brevity.

Does the model actually *understand* these things? I have no idea. But it *behaves* like it does.

## The Limits (Which Are Real)

This is a small project. 5 concepts. 20 explanations. That's enough to see patterns, not enough to prove anything.

I don't know if this generalizes to other concepts. I don't know if GPT-4 does the same thing. I don't know if these explanations actually help people learn—I just measured structure.

Also I'm genuinely uncertain about the vocabulary analysis. The data was weird in a way I didn't totally understand. That bothered me enough that I left it out of the final findings.

The brevity constraint is real, but maybe intentional. Maybe the model knows it can't do everything in 2 sentences so it prioritizes depth. Or maybe it's just a consequence of how it was built.

I don't actually know.

##Why I'm Pursuing the OpenAI Residency

This project made something click for me. I spent 3 years at PlatePost designing AI interfaces. I was good at it.

But I got frustrated because I was building without understanding. It felt like designing cars without knowing how engines work.

This small research project showed me what actually interests me: the mechanisms. Not the product, the system. How do language models represent knowledge? How do they decide to use analogies for kids but precision for experts? What's happening inside when it makes those choices?

I'm applying to the OpenAI Residency because I want to spend 6 months asking harder versions of these questions—with mentorship from people who've actually built these systems.

I don't need prestige. I genuinely want to understand how these things work at a level most people don't bother with.

This project proved I'll teach myself. The residency is where I want the help.

---

**Full code and data:** https://github.com/mmanohar24/educational-ai-interpretability

**Detailed findings:** Check out the RESEARCH_FINDINGS.md in the repo if you want the full breakdown.
