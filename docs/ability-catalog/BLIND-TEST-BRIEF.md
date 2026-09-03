# Blind Record Analysis

You are given a single JSON data record from a system you know nothing about. It describes some kind of creature. You have been given no documentation, no schema definitions, no lore, and no explanation of what the system is for. That is deliberate.

The record is in `blind-test-record.json` in this same directory. Read it, then deliver four numbered sections:

1. **The picture.** Describe this creature as fully as you can from the data alone: what it is, what its body is like, how it behaves, what it can do, how its abilities work, how it came to exist. Commit to interpretations; where you are guessing, say so and say why the data forced you to guess.

2. **Uninterpretable fields.** Every field or value you cannot confidently interpret from the record alone. For each: what readings are plausible, and what single piece of information would disambiguate it.

3. **Missing aspects.** Things you would expect a comprehensive codification of a creature to capture that this record does not appear to capture at all. Think broadly: body, mind, behavior, capability, history, identity, presentation. Do not pad the list; only include things a reasonable consumer of this data would actually miss.

4. **Internal tensions.** Any values that seem to contradict each other or strain a coherent reading of the creature.

Be specific and adversarial. Restating the JSON back is not analysis. The goal is to test whether this record alone can fully paint the picture of the creature; every place it cannot is a finding.
