export class GroupModel {
    constructor(ID, flags, systemBehavior, lastMessageTime, associatedChannelID) {
        this.ID = ID
        this.flags = flags
        this.systemBehavior = systemBehavior
        this.lastMessageTime = lastMessageTime
        this.associatedChannelID = associatedChannelID
    }

    getFlag(start, end) {
        return (this.flags % (2 ** end) - this.flags % (2 ** start)) >> start
    }

    setFlag(start, end, value) {
        const mask = (2 ** (end - start) - 1) << start
        this.flags = (this.flags & ~mask) | ((value << start) & mask)
    }

    static fromQueryResult(result) {
        return GroupModel(result.ID, result.Flags, result.SystemBehavior, result.LastMessageTime, result.AssociatedChannelID)
    }


    static from(group) {
        let obj = new GroupModel(group.ID, 0, group.systemBehavior, group.lastMessageTime.toString(), group.associatedChannelID)
        obj.setFlag(0, 6, group.numberOfFlags)
        obj.setFlag(6, 7, group.isEnabled)
        obj.setFlag(7, 8, group.hasLeft)
        obj.setFlag(8, 10, group.commandOrder)
        obj.setFlag(10, 11, group.isAssociatedWithChannel)
        obj.setFlag(11, 12, group.isAnonymChannelAnAdmin)

        return obj
    }

    // It is a multi purpose function that can perform both UPDATE and INSERT
    // it will know when to use INSERT by checking the database for presence of the desired entry
    // skipping the check will cause it to run UPDATE statement regardless
    static async store(group, env, skipCheck) {
        if (group instanceof Group) {
            group = GroupModel.from(group)
        }
        
        // we might be confident the group was already in database
        if (!skipCheck) {
            let test = await Group.getGroupByID(group.ID, env)

            if (test == null) {
                const ret = await env.DB.prepare("INSERT INTO Groups (ID, Flags, SystemBehavior, LastMessageTime, AssociatedChannelID) VALUES (?, ?, ?, ?, ?)")
                .bind(group.ID, group.flags, group.systemBehavior, group.lastMessageTime, group.associatedChannelID)
                .run()
                return ret.success
            }
        }

        const ret = await env.DB.prepare("UPDATE Groups SET Flags = ?, SystemBehavior = ?, LastMessageTime = ?, AssociatedChannelID = ? WHERE ID = ?")
            .bind(group.flags, group.systemBehavior, group.lastMessageTime, group.associatedChannelID, group.ID)
            .run()
        return ret.success
    }
}

export class Group {
    constructor(groupModel) {
        this.ID = groupModel.ID
        this.systemBehavior = groupModel.systemBehavior
        this.lastMessageTime = parseInt(groupModel.lastMessageTime)
        this.associatedChannelID = groupModel.associatedChannelID
        this.numberOfFlags = groupModel.getFlag(0, 6)
        this.isEnabled = groupModel.getFlag(6, 7)
        this.hasLeft = groupModel.getFlag(7, 8)
        this.commandOrder = groupModel.getFlag(8, 10)
        this.isAssociatedWithChannel = groupModel.getFlag(10, 11)
        this.isAnonymChannelAnAdmin = groupModel.getFlag(11, 12)
    }

    static async getGroupByID(ID, env) {
        const stmt = env.DB.prepare("SELECT * FROM Groups WHERE ID = ?").bind(ID)
        const ret = await stmt.run()

        if (ret.results == null || !ret.results.length) return null;

        let model = GroupModel.fromQueryResult(ret.results[0]);
        let group = new Group(model);

        return group
    }

    static create() {
        let model = new GroupModel(0, 0, "", 0, 0)
        let group = new Group(model)
        return group
    }
}