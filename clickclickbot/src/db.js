export class GroupModel {
    constructor(ID, flags, systemBehavior, lastMessageTime) {
        this.ID = ID
        this.flags = flags,
            this.systemBehavior = systemBehavior
        this.lastMessageTime = lastMessageTime
    }

    static fromQueryResult(result) {
        return GroupModel(result.ID, result.Flags, result.SystemBehavior, result.LastMessageTime)
    }

    static from(group) {
        let obj = new GroupModel(group.ID, 0, group.systemBehavior, group.lastMessageTime.toString())
        obj.setFlag(0, 6, group.numberOfFlags)
        obj.setFlag(6, 7, group.isEnabled)
        obj.setFlag(7, 8, group.hasLeft)
        obj.setFlag(8, 10, group.commandOrder)
    }

    getFlag(start, end) {
        return (this.flags % (2 ** end) - this.flags % (2 ** start)) >> start
    }

    setFlag(start, end, value) {
        const mask = (2 ** (end - start) - 1) << start
        this.flags = (this.flags & ~mask) | ((value << start) & mask)
    }
}

export class Group {
    constructor(groupModel) {
        this.ID = groupModel.ID
        this.systemBehavior = groupModel.systemBehavior
        this.lastMessageTime = parseInt(groupModel.lastMessageTime)
        this.numberOfFlags = groupModel.getFlag(0, 6)
        this.isEnabled = groupModel.getFlag(6, 7)
        this.hasLeft = groupModel.getFlag(7, 8)
        this.commandOrder = groupModel.getFlag(8, 10)
    }
}