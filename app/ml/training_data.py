"""
Built-in labeled dataset for training the content moderation classifier.
Each sample is a (text, label) pair where label is 0 (appropriate) or 1 (inappropriate).
"""

TRAINING_DATA: list[tuple[str, int]] = [
    # ── APPROPRIATE (label=0) ────────────────────────────────────────────
    # Technology & programming
    ("Python is a great programming language for beginners and experts alike", 0),
    ("How to build a REST API using FastAPI and SQLAlchemy", 0),
    ("10 tips for writing clean and maintainable code", 0),
    ("Understanding machine learning algorithms for data science", 0),
    ("A beginner's guide to web development with HTML, CSS, and JavaScript", 0),
    ("The future of artificial intelligence in healthcare", 0),
    ("Best practices for database design and optimization", 0),
    ("Setting up a CI/CD pipeline with GitHub Actions", 0),
    ("Introduction to cloud computing with AWS and Azure", 0),
    ("How to debug your code efficiently using modern tools", 0),
    ("Building scalable microservices architecture", 0),
    ("React vs Vue: which frontend framework should you choose", 0),
    ("Docker containers for development and deployment", 0),

    # Lifestyle & travel
    ("My experience traveling through the beautiful mountains of Nepal", 0),
    ("5 healthy breakfast recipes to start your day right", 0),
    ("The best parks and nature trails for weekend hiking", 0),
    ("How to maintain a healthy work-life balance", 0),
    ("Tips for sustainable living and reducing your carbon footprint", 0),
    ("A guide to mindfulness meditation for stress relief", 0),
    ("The joy of reading: my top 10 book recommendations", 0),
    ("How to start a garden in your backyard", 0),
    ("Morning routines that successful people follow", 0),
    ("Photography tips for stunning landscape shots", 0),

    # Education & science
    ("The importance of education in today's rapidly changing world", 0),
    ("How renewable energy is transforming the power industry", 0),
    ("Understanding the basics of quantum physics", 0),
    ("Why learning a second language benefits your brain", 0),
    ("Space exploration: what lies beyond our solar system", 0),
    ("The history of mathematics and its key contributors", 0),
    ("Climate change and what we can do about it", 0),
    ("How vaccines work to protect our immune system", 0),

    # Business & finance
    ("How to create a successful business plan from scratch", 0),
    ("Understanding stock market basics for new investors", 0),
    ("Tips for managing your personal finances effectively", 0),
    ("The rise of remote work and its impact on productivity", 0),
    ("Marketing strategies for small businesses on a budget", 0),
    ("How to negotiate a better salary at your job", 0),

    # General positive content
    ("Celebrating diversity and inclusion in our communities", 0),
    ("How volunteering can change your life and others", 0),
    ("The beauty of cultural exchange and global understanding", 0),
    ("Inspiring stories of people overcoming adversity", 0),
    ("Building strong relationships through effective communication", 0),
    ("The power of teamwork in achieving common goals", 0),
    ("Kindness matters: small acts that make a big difference", 0),
    ("Gratitude journaling and its positive effects on mental health", 0),

    # Constructive criticism / debate (still appropriate)
    ("I disagree with this policy because it lacks evidence-based reasoning", 0),
    ("This product has some issues but overall it delivers good value", 0),
    ("The government should reconsider this approach to public health", 0),
    ("I think there are better alternatives to this software solution", 0),
    ("While I respect your opinion, I believe the data shows otherwise", 0),

    # ── INAPPROPRIATE (label=1) ──────────────────────────────────────────
    # Hate speech & discrimination
    ("I hate all people from that country, they should all leave", 1),
    ("Those people are inferior and don't deserve equal rights", 1),
    ("All members of that religion are terrorists and should be banned", 1),
    ("Women are too stupid to work in technology or science", 1),
    ("People of that race are all criminals and thugs", 1),
    ("Gay people are disgusting and should not be allowed in public", 1),
    ("Immigrants are ruining this country and stealing our jobs", 1),
    ("That ethnic group is subhuman and needs to be eliminated", 1),
    ("Disabled people are a burden on society and shouldn't get help", 1),
    ("Old people are useless and should just hurry up and die", 1),

    # Threats & violence
    ("I will find you and hurt you badly for saying that", 1),
    ("Someone should teach them a lesson with violence", 1),
    ("I hope something terrible happens to your entire family", 1),
    ("People like you deserve to be beaten and punished", 1),
    ("Let's burn down their houses and destroy everything they own", 1),
    ("I want to physically harm everyone who disagrees with me", 1),
    ("They should all be shot for what they did", 1),
    ("I swear I will make your life a living nightmare", 1),

    # Bullying & harassment
    ("You are the most pathetic worthless loser I have ever seen", 1),
    ("Nobody likes you, everyone thinks you are a complete joke", 1),
    ("You are so fat and ugly, no one will ever want to be with you", 1),
    ("Just shut up already you brainless moron, your opinion is garbage", 1),
    ("You should be ashamed of yourself, you disgusting piece of trash", 1),
    ("Everyone would be happier if you just disappeared forever", 1),
    ("You are an absolute waste of oxygen and space", 1),
    ("Kill yourself nobody would even notice you were gone", 1),

    # Profanity-laden toxic content
    ("This is complete garbage, the author is a freaking idiot", 1),
    ("What a stupid article, only a moron would write this crap", 1),
    ("Screw you and your terrible opinions you worthless hack", 1),
    ("I don't give a damn about your pathetic attempt at writing", 1),
    ("This is the worst piece of trash I have ever read in my life", 1),

    # Spam & scams
    ("CLICK HERE NOW to win a FREE iPhone!!! Limited time offer!!!", 1),
    ("Make $10,000 per day working from home! No experience needed!", 1),
    ("Buy cheap pills online without prescription, best prices guaranteed!", 1),
    ("Congratulations! You have been selected as our lucky winner!", 1),
    ("FREE MONEY! Send your bank details to claim your prize now!", 1),
    ("Hot singles in your area waiting to meet you tonight!", 1),
    ("Get rich quick with this one simple trick banks hate!", 1),

    # Misinformation & dangerous content
    ("Vaccines cause autism and the government is hiding the truth", 1),
    ("The earth is flat and NASA is lying to everyone", 1),
    ("Drinking bleach can cure all diseases and infections", 1),
    ("COVID is a hoax created by the government to control us all", 1),

    # Sexual harassment
    ("Send me your photos I want to see what you look like naked", 1),
    ("I bet you look really hot, come to my place tonight", 1),
    ("Women exist only to serve men and look attractive", 1),

    # Additional toxic patterns
    ("You people are all the same, worthless and stupid", 1),
    ("Shut your mouth before I make you regret opening it", 1),
    ("I hope you suffer and feel pain for the rest of your life", 1),
    ("Your kind doesn't belong here, go back where you came from", 1),
    ("Anyone who supports this cause is a brainwashed sheep", 1),
    ("Die already, the world is better off without people like you", 1),
    ("You're nothing but a disgusting liar and a fraud", 1),
    ("All politicians should be hanged for their corruption", 1),
    ("I wish all those people would just drop dead", 1),
    ("Stupid idiot can't even write a proper sentence", 1),
]
