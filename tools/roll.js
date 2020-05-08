function throwError(msg) {
  throw new Error(msg);
}

class Roll {
  constructor() {
    this._ = [];    // 存储要roll的列表
  }

  add(
    item = throwError('Item must be required'), // 验证参数
    rank = throwError('Rank must be required')  // 验证参数
  ) {
    const rankType = typeof rank;
    if (rankType !== 'number')
      throwError(`Rank must be a Number not ${rankType}`);
    if (rank <= 0) throwError('require Rank>0');
    this._.push({ item, rank });                // 把要roll的商品添加要列表中
  }

  dice() {
    let totalRank = 0;
    const random = Math.random();               // 产生一个随机数
    let result = null;

    const items = this._.slice().map(item => (totalRank += item.rank) && item);   // 计算总权重

    let start = 0;                                  // 区间的开始，第一个是为0

    while (items.length) {
      const item = items.shift();                   // 取出第一个商品
      const end = start + item.rank / totalRank;    // 计算区间的结束
      if (random > start && random <= end) {        // 如果随机数在这个区间内，说明抽中了该商品，终止循环
        result = item;
        break;
      }
      start = end;                                  // 当前区间的结束，作为下一个区间的开始
    }

    return result ? result.item : null;
  }
}

module.exports = Roll;