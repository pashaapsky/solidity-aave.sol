const IWETH9Json = require("../artifacts/contracts/interfaces/IWeth9.sol/IWETH9.json")
const ILendingPoolAddressesProviderJson = require("../artifacts/contracts/interfaces/ILendingPoolAddressesProvider.sol/ILendingPoolAddressesProvider.json")
const ILendingPoolJson = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json")
const IERC20Json = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")
const IAggregatorV3Json = require("../artifacts/contracts/interfaces/IAggregatorV3.sol/IAggregatorV3.json")
const {ethers, deployments, network, getChainId, config} = require("hardhat");

const APPROVING_AMOUNT = ethers.utils.parseUnits("0.1", "ether");

//converting ETH => WETH (The ERC20 version of ETH)
async function main() {
    const [owner, addr1] = await ethers.getSigners();

    // переводим eth => weth (запускать когда нужно перевести)
    // await getWeth(APPROVING_AMOUNT);

    //адресса контрактов
    const wethToken = config.networks[network.name].wethToken;
    const daiEthPriceFeed = config.networks[network.name].daiToEthPriceFeed;
    const daiToken = config.networks[network.name].daiToken;

    //интерфейс для взаимодействия с токеном AAVE
    const lendingPool = await getLendingPool();
    // //нужно подтверждение отправки ERC20 токенов (сколько)
    await approveERC20(APPROVING_AMOUNT, lendingPool.address, wethToken, owner);
    //Вклад в сервис AAVE
    console.log("Depositing...");
    const depositTx = await lendingPool.deposit(wethToken, APPROVING_AMOUNT, owner.address, 0);
    await depositTx.wait();
    console.log("Deposited!");
    //Проверяем наш баланс на аккаунте в AAVE
    const [availableBorrowsETH] = await getAAVEAccountData(lendingPool, owner);
    //Получим нужную валюту на примере DAI
    const daiEthPrice = await getAssetPrice(daiEthPriceFeed);
    //сколько DAI вообще возможно взять в залог
    const amountDaiToBorrow = availableBorrowsETH * 0.99 / daiEthPrice;
    console.log(`We are going to borrow ${amountDaiToBorrow} DAI`);
    //Берем в залог
    const borrowTx = await lendingPool.borrow(daiToken, ethers.utils.parseUnits(String(amountDaiToBorrow), "ether"), 1, 0, owner.address);
    await borrowTx.wait();
    console.log('End borrowing!');
    //Проверяем наш баланс
    const [_, totalDebtETH] = await getAAVEAccountData(lendingPool, owner);
    //Отдаем залог обратно
    const amountDaiToRepay = totalDebtETH / daiEthPrice;
    console.log(`We are going to repay ${amountDaiToRepay} DAI`);
    await repayAll(ethers.utils.parseUnits(String(amountDaiToRepay * 1.01), "ether"), lendingPool, owner);
    console.log('Deposit, borrow and repayed successful with AAVE prot!');
}

/**
 * Возвращает весь залог
 * @param amountInWei
 * @param lendingPoll
 * @param account
 * @returns {Promise<void>}
 */
async function repayAll(amountInWei, lendingPoll, account) {
    const daiToken = config.networks[network.name].daiToken;
    //получаем одобрение на вывод средств
    await approveERC20(amountInWei, lendingPoll.address, daiToken, account);
    console.log('Start repaying...');
    const repayTx = await lendingPoll.repay(daiToken, amountInWei, 1, account.address);
    await repayTx.wait();
    console.log("Repayed!");
}

/**
 * Получить стоимость актива к 1 ETH
 * @param priceFeedAddress
 * @returns {Promise<*>}
 */
async function getAssetPrice(priceFeedAddress) {
    const daiEthPriceFeed = await ethers.getContractAt(IAggregatorV3Json.abi, priceFeedAddress);
    console.log('Getting last daiToEth price...');
    let [_, latestPrice] = await daiEthPriceFeed.latestRoundData();
    latestPrice = ethers.utils.formatEther(latestPrice);
    console.log('The latest price is: ', latestPrice);

    return latestPrice;
}

/**
 * Получить информацию об аккаунте
 * @param lendingPool
 * @param account
 * @returns {Promise<*[]>}
 */
async function getAAVEAccountData(lendingPool, account) {
    console.log("get UserAAVE Data...");
    let [totalCollateralETH, totalDebtETH, availableBorrowsETH, currentLiquidationThreshold, ltv, healthFactor] = await lendingPool.getUserAccountData(account.address);
    availableBorrowsETH = ethers.utils.formatEther(availableBorrowsETH);
    totalCollateralETH = ethers.utils.formatEther(totalCollateralETH);
    totalDebtETH = ethers.utils.formatEther(totalDebtETH);
    console.log(`You have: ${totalCollateralETH} worth of ETH deposited!`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed!`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);

    return [availableBorrowsETH, totalDebtETH];
}

/**
 * Подтвердить отправку кол-ва токентов ERC20
 * @param amount
 * @param spender
 * @param erc20address
 * @param accountFrom
 * @returns {Promise<*>}
 */
async function approveERC20(amount, spender, erc20address, accountFrom) {
    console.log(`Approving ${amount} ERC20 token...`);
    const erc20 = await ethers.getContractAt(IERC20Json.abi, erc20address);
    const tx = await erc20.connect(accountFrom).approve(spender, amount);
    await tx.wait();
    console.log("Approved!");

    return tx;
}

/**
 * Получить LendingPool контракт для работы с токеном AAVE
 * @returns {Promise<Contract>}
 */
async function getLendingPool() {
    const lendingPoolAddressesProvider = await ethers.getContractAt(ILendingPoolAddressesProviderJson.abi, config.networks[network.name].lendingPoolAddressesProvider);
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
    console.log('lendingPoolAddress: ', lendingPoolAddress);
    const lendingPool = await ethers.getContractAt(ILendingPoolJson.abi, lendingPoolAddress);

    return lendingPool;
}

/**
 * Обменять eth на weth - обернутый eth (ERC20)
 * @param amount
 * @returns {Promise<*>}
 */
async function getWeth(amount) {
    /*
    Mints WETH by depositing ETH.
     */
    const [owner] = await ethers.getSigners();
    const weth = await ethers.getContractAt(IWETH9Json.abi, config.networks[network.name].wethToken);
    //меняет eth на weth
    const tx = await weth.connect(owner).deposit({value: amount});
    await tx.wait();

    return tx;
}

//Закоментировать перед тестированием!
// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });

module.exports.repayAll = repayAll;
module.exports.getAssetPrice = getAssetPrice;
module.exports.getAAVEAccountData = getAAVEAccountData;
module.exports.approveERC20 = approveERC20;
module.exports.getLendingPool = getLendingPool;
module.exports.getWeth = getWeth;


