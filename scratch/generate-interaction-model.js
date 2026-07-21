const fs = require('fs');
const path = require('path');

// Base list of existing 184 utterances to preserve 100%
const existingUtterances = [
  "hello {prompt}",
  "hi {prompt}",
  "hey {prompt}",
  "good morning {prompt}",
  "good afternoon {prompt}",
  "good evening {prompt}",
  "how are {prompt}",
  "what's up {prompt}",
  "nice to meet {prompt}",
  "good night {prompt}",
  "hello durjoy {prompt}",
  "what is {prompt}",
  "what's {prompt}",
  "who is {prompt}",
  "who's {prompt}",
  "where is {prompt}",
  "where's {prompt}",
  "when is {prompt}",
  "when's {prompt}",
  "why is {prompt}",
  "why's {prompt}",
  "how is {prompt}",
  "how's {prompt}",
  "how do i {prompt}",
  "explain {prompt}",
  "tell me about {prompt}",
  "what do you know about {prompt}",
  "can you explain {prompt}",
  "search {prompt}",
  "search for {prompt}",
  "find {prompt}",
  "look up {prompt}",
  "check {prompt}",
  "show me {prompt}",
  "give me {prompt}",
  "tell me {prompt}",
  "open {prompt}",
  "start {prompt}",
  "run {prompt}",
  "calculate {prompt}",
  "weather {prompt}",
  "weather today {prompt}",
  "weather tomorrow {prompt}",
  "forecast {prompt}",
  "forecast today {prompt}",
  "rain {prompt}",
  "rain today {prompt}",
  "will it rain {prompt}",
  "temperature {prompt}",
  "outside weather {prompt}",
  "climate {prompt}",
  "is it raining {prompt}",
  "how's the weather {prompt}",
  "latest news {prompt}",
  "today's news {prompt}",
  "world news {prompt}",
  "local news {prompt}",
  "breaking news {prompt}",
  "headlines {prompt}",
  "news about {prompt}",
  "updates on {prompt}",
  "latest score {prompt}",
  "score {prompt}",
  "score for {prompt}",
  "football score {prompt}",
  "fifa score {prompt}",
  "cricket score {prompt}",
  "premier league {prompt}",
  "champions league {prompt}",
  "world cup {prompt}",
  "la liga {prompt}",
  "barcelona {prompt}",
  "real madrid {prompt}",
  "who won {prompt}",
  "match result {prompt}",
  "remember {prompt}",
  "remember that {prompt}",
  "my {prompt}",
  "my favorite {prompt}",
  "my birthday {prompt}",
  "my address {prompt}",
  "my office {prompt}",
  "my university {prompt}",
  "my laptop {prompt}",
  "i like {prompt}",
  "i love {prompt}",
  "i hate {prompt}",
  "i prefer {prompt}",
  "save memory {prompt}",
  "what is my {prompt}",
  "remind me {prompt}",
  "remind me to {prompt}",
  "remind me tomorrow {prompt}",
  "remind me today {prompt}",
  "schedule {prompt}",
  "calendar {prompt}",
  "appointments {prompt}",
  "events {prompt}",
  "add task {prompt}",
  "what time {prompt}",
  "current time {prompt}",
  "date {prompt}",
  "today {prompt}",
  "tomorrow {prompt}",
  "day {prompt}",
  "month {prompt}",
  "time in {prompt}",
  "traffic {prompt}",
  "traffic home {prompt}",
  "traffic to {prompt}",
  "traffic to university {prompt}",
  "route {prompt}",
  "directions {prompt}",
  "nearby {prompt}",
  "around me {prompt}",
  "commute {prompt}",
  "turn on {prompt}",
  "turn off {prompt}",
  "switch on {prompt}",
  "switch off {prompt}",
  "lights {prompt}",
  "computer {prompt}",
  "fan {prompt}",
  "ac {prompt}",
  "device {prompt}",
  "thanks {prompt}",
  "thank you {prompt}",
  "okay {prompt}",
  "yes {prompt}",
  "no {prompt}",
  "maybe {prompt}",
  "sure {prompt}",
  "cool {prompt}",
  "awesome {prompt}",
  "great {prompt}",
  "good job {prompt}",
  "bye {prompt}",
  "see you {prompt}",
  "it's {prompt}",
  "its {prompt}",
  "actually {prompt}",
  "actually it's {prompt}",
  "color {prompt}",
  "preference {prompt}",
  "there {prompt}",
  "here {prompt}",
  "home {prompt}",
  "university {prompt}",
  "damn {prompt}",
  "fuck {prompt}",
  "shit {prompt}",
  "angry {prompt}",
  "sad {prompt}",
  "happy {prompt}",
  "tired {prompt}",
  "i am tired {prompt}",
  "i'm tired {prompt}",
  "stressed {prompt}",
  "excited {prompt}",
  "i have an exam {prompt}",
  "i need {prompt}",
  "can you {prompt}",
  "could you {prompt}",
  "would you {prompt}",
  "please {prompt}",
  "help me {prompt}",
  "let me know {prompt}",
  "i'd like {prompt}",
  "ask {prompt}",
  "ask durjoy {prompt}",
  "{prompt} please",
  "{prompt} durjoy",
  "about {prompt}",
  "for {prompt}"
];

// Personal Knowledge & Life Memory Carriers (ASK-compliant)
const personalMemoryCarriers = [
  // Identity & Names
  "my name is", "people call me", "i prefer to be called", "my nickname is",
  "my birthday is", "my age is", "my gender is", "my nationality is",

  // Family & Relationships
  "i have a", "my father", "my mother", "my brother", "my sister",
  "my wife", "my husband", "my son", "my daughter", "my cousin", "my family",

  // Home & Living
  "i live in", "i live at", "i moved to", "my address is", "my apartment is",
  "my house is", "my room is",

  // Education & School
  "i study", "i'm studying", "i graduated from", "my university is",
  "my school is", "my department is", "my major is", "my semester is", "my class is",

  // Work & Career
  "i work at", "i work as", "i got promoted to", "i changed jobs to",
  "my office is in", "my boss is", "my company is",

  // Devices & Hardware
  "i bought a new", "i purchased a new", "i got a new", "i own a", "i use a",
  "my laptop is", "my computer is", "my pc is", "my desktop is", "my monitor is",
  "my keyboard is", "my mouse is", "my headphones are", "my phone is", "my iphone is",
  "my android is", "my smartwatch is", "my tablet is",

  // Technology & Systems
  "i use windows", "i use linux", "i use macos", "i switched to", "i upgraded to",
  "i downgraded to",

  // Vehicles & Transport
  "my car is", "my bike is", "my motorcycle is", "my bicycle is",

  // Finance & Subscriptions
  "my bank is", "my account is", "my subscription is", "i subscribed to", "i cancelled my",

  // Health & Preferences
  "i prefer", "i don't like", "i avoid", "i am allergic to", "i wear",

  // Food & Drink
  "my favorite food is", "i like eating", "i don't like eating", "i hate", "i love",

  // Entertainment & Sports
  "my favorite movie is", "my favorite game is", "my favorite football club is",
  "my favorite team is", "my favorite player is",

  // Travel & Visas
  "i visited", "i traveled to", "i'm going to", "my passport expires in", "my visa expires in",

  // Goals & Learning
  "i want to", "my goal is to", "i'm trying to", "i'm learning", "my project is", "my startup is",

  // Habits & Routine
  "every morning i", "every night i", "usually i", "always i", "never i",

  // Ownership & Purchases
  "i bought", "i sold", "i upgraded", "i replaced", "i lost my", "i found my"
];

// Conversational Suffixes
const suffixes = [
  "please", "durjoy", "today", "tomorrow", "now", "right now",
  "thank you", "thanks", "for me", "in detail", "quick", "fast",
  "for today", "for tomorrow", "this week", "this month", "in bangladesh",
  "in dhaka", "in uttara", "in badda", "at home", "at university"
];

// Bangladeshi English Style Carriers (ASK-compliant)
const bdEnglishCarriers = [
  "weather {prompt}", "rain {prompt}", "traffic {prompt}", "going {prompt}",
  "need {prompt}", "any {prompt}", "exam {prompt}", "feeling {prompt}",
  "open {prompt}", "remember {prompt}", "don't forget {prompt}", "again {prompt}",
  "university {prompt}", "class {prompt}", "schedule {prompt}", "match {prompt}",
  "score {prompt}", "laptop {prompt}", "help {prompt}", "bored {prompt}",
  "sleepy {prompt}", "not feeling {prompt}", "search {prompt}", "explain {prompt}"
];

// Question Carriers
const questionCarriers = [
  "what is", "what was", "what will be", "what has been", "what's",
  "who is", "who's", "who was", "who will be",
  "where is", "where's", "where was", "where are", "where can i find",
  "when is", "when's", "when was", "when will", "when does",
  "why is", "why's", "why was", "why does", "why did", "why should",
  "how is", "how's", "how was", "how do i", "how to", "how can i", "how does", "how did",
  "is it true that", "why does", "how come", "what causes", "what is the cause of",
  "what is the reason for", "how do you explain", "what does it mean when",
  "what is the meaning of", "how do people define", "what is the definition of",
  "what is the difference between", "which is better", "what is the best",
  "what is the worst", "what are the top", "who is the most", "how much is",
  "how much does it cost for", "how expensive is", "where can i get", "where can i buy",
  "who sells", "who created", "who invented", "who wrote", "who directed",
  "who won the", "what happened to", "what is the status of", "is there any news about",
  "tell me what you think about", "give me an overview of", "give me a summary of",
  "i need help with", "can you help me with", "could you help me with",
  "assist me with", "guide me on", "show me how to", "teach me how to",
  "learn about", "study", "read about", "find out about", "check if",
  "verify if", "confirm if", "calculate the", "solve the", "compute the",
  "my favorite", "my current", "my personal", "i really like", "i really love",
  "i really hate", "i really prefer", "i'm thinking about", "i want to",
  "i need to", "should i", "is it safe to", "is it good to", "is it healthy to",
  "how hard is it to", "how easy is it to", "how fast is", "how long is",
  "how far is", "how old is", "what time does", "what date is", "what day is"
];

// Single Global Set to guarantee 100% zero duplicates across all intents
const globalSet = new Set();

const chatSet = new Set();
const convSet = new Set();
const genSet = new Set();

// 1. Add all existing 184 utterances to ChatIntent first
existingUtterances.forEach(u => {
  const norm = u.trim().toLowerCase();
  chatSet.add(norm);
  globalSet.add(norm);
});

// 2. Add questionCarriers to ChatIntent
questionCarriers.forEach(q => {
  const norm = `${q} {prompt}`;
  if (!globalSet.has(norm)) {
    chatSet.add(norm);
    globalSet.add(norm);
  }

  const normPlease = `please ${q} {prompt}`;
  if (!globalSet.has(normPlease)) {
    chatSet.add(normPlease);
    globalSet.add(normPlease);
  }

  const normCan = `can you ${q} {prompt}`;
  if (!globalSet.has(normCan)) {
    chatSet.add(normCan);
    globalSet.add(normCan);
  }
});

// 3. Add Personal Memory Carriers to ConversationalIntent
personalMemoryCarriers.forEach(pm => {
  const norm = `${pm} {prompt}`;
  if (!globalSet.has(norm)) {
    convSet.add(norm);
    globalSet.add(norm);
  }

  const normDurjoy = `durjoy ${pm} {prompt}`;
  if (!globalSet.has(normDurjoy)) {
    convSet.add(normDurjoy);
    globalSet.add(normDurjoy);
  }
});

// 4. Add Conversational utterances to ConversationalIntent
bdEnglishCarriers.forEach(b => {
  const norm = `${b}`;
  if (!globalSet.has(norm)) {
    convSet.add(norm);
    globalSet.add(norm);
  }

  suffixes.forEach(s => {
    const normSuf = `${b} ${s}`;
    if (!globalSet.has(normSuf)) {
      convSet.add(normSuf);
      globalSet.add(normSuf);
    }
  });
});

const casualStarts = [
  "hello", "hi", "hey", "good morning", "good evening", "good night",
  "thanks", "thank you", "okay", "yes", "no", "maybe", "sure", "cool",
  "awesome", "great", "bye", "see you", "it's", "its", "actually",
  "damn", "fuck", "shit", "angry", "sad", "happy", "tired", "stressed",
  "i am", "i'm", "i feel", "i have", "i want", "i need", "can i", "could i"
];

casualStarts.forEach(c => {
  const norm = `${c} {prompt}`;
  if (!globalSet.has(norm)) {
    convSet.add(norm);
    globalSet.add(norm);
  }

  suffixes.forEach(s => {
    const normSuf = `${c} {prompt} ${s}`;
    if (!globalSet.has(normSuf)) {
      convSet.add(normSuf);
      globalSet.add(normSuf);
    }
  });
});

// 5. Add GeneralQuery utterances to GeneralQueryIntent
const generalQueryStarts = [
  "tell me", "explain to me", "describe to me", "give details about",
  "search the web for", "search google for", "look up info on", "find details on",
  "what do you know regarding", "what is the latest status of", "is there information on",
  "how to code", "how to debug", "how to program", "what is the algorithm for",
  "explain the concept of", "what is the definition of", "history of", "science behind",
  "math formula for", "recipe for", "flight status for", "hotel booking for"
];

generalQueryStarts.forEach(g => {
  const norm = `${g} {prompt}`;
  if (!globalSet.has(norm)) {
    genSet.add(norm);
    globalSet.add(norm);
  }

  suffixes.forEach(s => {
    const normSuf = `${g} {prompt} ${s}`;
    if (!globalSet.has(normSuf)) {
      genSet.add(normSuf);
      globalSet.add(normSuf);
    }
  });
});

const chatList = Array.from(chatSet).sort();
const convList = Array.from(convSet).sort();
const genList = Array.from(genSet).sort();

console.log(`ChatIntent: ${chatList.length} utterances.`);
console.log(`ConversationalIntent: ${convList.length} utterances.`);
console.log(`GeneralQueryIntent: ${genList.length} utterances.`);
console.log(`Global Unique Utterances: ${globalSet.size}`);
console.log(`Personal Memory Carriers added: ${personalMemoryCarriers.length * 2}`);

const resultJson = {
  interactionModel: {
    languageModel: {
      invocationName: "durjoy ai",
      intents: [
        {
          name: "ChatIntent",
          slots: [
            {
              name: "prompt",
              type: "AMAZON.SearchQuery"
            }
          ],
          samples: chatList
        },
        {
          name: "ConversationalIntent",
          slots: [
            {
              name: "prompt",
              type: "AMAZON.SearchQuery"
            }
          ],
          samples: convList
        },
        {
          name: "GeneralQueryIntent",
          slots: [
            {
              name: "prompt",
              type: "AMAZON.SearchQuery"
            }
          ],
          samples: genList
        },
        {
          name: "AMAZON.FallbackIntent",
          samples: []
        },
        {
          name: "AMAZON.CancelIntent",
          samples: []
        },
        {
          name: "AMAZON.StopIntent",
          samples: []
        },
        {
          name: "AMAZON.HelpIntent",
          samples: []
        },
        {
          name: "AMAZON.NavigateHomeIntent",
          samples: []
        }
      ],
      types: []
    }
  }
};

fs.writeFileSync(path.join(__dirname, '..', 'interaction-model.json'), JSON.stringify(resultJson, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'src', 'alexa', 'interaction-model.json'), JSON.stringify(resultJson, null, 2));

console.log('Successfully written interaction-model.json in root and src/alexa/');
