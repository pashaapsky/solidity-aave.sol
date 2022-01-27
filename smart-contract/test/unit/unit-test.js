const {expect} = require("chai");
const {ethers, getChainId, deployments, config, network} = require("hardhat");
const {getAssetPrice, getLendingPool, approveERC20} = require("../../scripts/workWithAave");

describe("Unit tests:", () => {
    let daiEthPriceFeed;
    let wethToken;
    let owner;

    before(async () => {
        owner = await ethers.getSigners().then(res => res[0]);
        daiEthPriceFeed = config.networks[network.name].daiToEthPriceFeed;
        wethToken = config.networks[network.name].wethToken;
    });

    it("Проверка получения стоимости актива в ETH.", async () => {
        await expect(await getAssetPrice(daiEthPriceFeed) > 0).to.be.true;
    });

    it("Проверка получения lengingPool AAVE.", async () => {
        await expect(await getLendingPool()).to.exist;
    });

    it("Проверка подтверждения токенов для операции.", async () => {
        const lendingPool = await getLendingPool();
        const amount = ethers.utils.parseUnits("1", "ether");

        const tx = await approveERC20(amount, lendingPool.address, wethToken, owner);
        await expect(tx.hash).to.exist;
    });
});
