DROP TABLE IF EXISTS Groups;
CREATE TABLE IF NOT EXISTS Groups(
    ID INTEGER PRIMARY KEY,
    Flags INTEGER, /*Full description of flags at the end*/
    SystemBehavior TEXT
    LastMessageTime INTEGER /*Temporal timestamp in milliseconds from Jan 1 1970 UTC*/
)

/*
    Flags are assigned bitwise, from right to left
    each flag has starting position (inclusive) and ending (exclusive)
    0-6: Number of assigned flags
    6-7: Bot is enabled for this group if 1, 0 otherwise
    7-8: Bot has left this group
    8-10: System command order in this group:
        0: everyone can chage configurations
        1: Only administrators
        2: Only group owner
        3: Only owner of the bot
*/