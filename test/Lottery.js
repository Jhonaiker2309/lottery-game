const { expect } = require("chai");
const { ethers, upgrades } = require( "hardhat" );
const { daiABI, usdtABI, usdcABI, linkABI } = require("../abis/abis.json");
const {toWei} = require("./utils")

describe("Market contract", function () {

    let etherscanAddressWithDai, etherscanAddressWithUsdt, etherscanAddressWithUsdc, etherscanAddressWithLink
    let Lottery, lottery, RandomNumber, randomNumber, VRFCoordinator, vrfCoordinator
    let link, usdt, dai, usdc
    let owner, account1, account2, accountWithDai, accountWithUsdt, accountWithUsdc, accountWithLink;

    etherscanAddressWithDai = "0x1821Eb432E091Cce0f2Aa13BD64399A474D325d0";
    etherscanAddressWithUsdt = "0xc852e1fdcCDeAfCCc9A3AC35e8944CfB573ACf7D";
    etherscanAddressWithUsdc = "0x053A749Ec24CE3Eabe5F34aE1DCfB4952DCFD935";
    etherscanAddressWithLink = "0xa037D8b538096889a1a6908956147bd0f6D0C49c";

    beforeEach(async function () {
        Lottery = await ethers.getContractFactory("Lottery");
        RandomNumber = await ethers.getContractFactory("RandomNumber");
        VRFCoordinator = await ethers.getContractFactory("VRFCoordinator");
        [owner, account1, account2] = await ethers.getSigners();
    
        await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [etherscanAddressWithDai]
		});

        accountWithDai = await ethers.getSigner(etherscanAddressWithDai);

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithUsdt],
	    });

	    accountWithUsdt = await ethers.getSigner(etherscanAddressWithUsdt);

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithUsdc],
	    });

	    accountWithUsdc = await ethers.getSigner(etherscanAddressWithUsdc);  

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithLink],
	    });

	    accountWithLink = await ethers.getSigner(etherscanAddressWithLink);                 

        dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", daiABI);
        usdt = new ethers.Contract("0xdAC17F958D2ee523a2206206994597C13D831ec7", usdtABI);
        usdc = new ethers.Contract("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", usdcABI);
        link = new ethers.Contract("0x514910771AF9Ca656af840dff83E8264EcF986CA", linkABI);

        randomNumber = await RandomNumber.deploy()
        await randomNumber.deployed()

        lottery = await Lottery.deploy();
        await lottery.initialize(randomNumber.address)

        vrfCoordinator = await VRFCoordinator.deploy(link.address)
        await vrfCoordinator.deployed()
        
});

    describe("Deployment", function () {

        it("Check if addresses of token owners are right", async function () {
            expect(accountWithDai.address.toLowerCase()).to.be.equal(etherscanAddressWithDai.toLowerCase())
            expect(accountWithUsdt.address.toLowerCase()).to.be.equal(etherscanAddressWithUsdt.toLowerCase())
            expect(accountWithUsdc.address.toLowerCase()).to.be.equal(etherscanAddressWithUsdc.toLowerCase())
            expect(accountWithLink.address.toLowerCase()).to.be.equal(etherscanAddressWithLink.toLowerCase())
        })

        it("Test start lottery", async function() {
            await expect(lottery.connect(account1).startLottery()).to.be.revertedWith("Not owner");
            const startOfLotteryBeforeFunction = await lottery.startOfCurrentLottery()
            const currentLotteryBeforeFunction = await lottery.currentLottery()
            const stateOfTokenReceptionBeforeFunction = await lottery.tokenReceptionIsActive()

            expect(startOfLotteryBeforeFunction).to.be.equal(0)
            expect(currentLotteryBeforeFunction).to.be.equal(0)
            expect(stateOfTokenReceptionBeforeFunction).to.be.equal(false)

            await lottery.connect(owner).startLottery()

            const startOfLotteryAfterFunction = await lottery.startOfCurrentLottery()
            const currentLotteryAfterFunction = await lottery.currentLottery()
            const stateOfTokenReceptionAfterFunction = await lottery.tokenReceptionIsActive()

            expect(startOfLotteryBeforeFunction < startOfLotteryAfterFunction).to.be.equal(true)
            expect(currentLotteryAfterFunction).to.be.equal(1)
            expect(stateOfTokenReceptionAfterFunction).to.be.equal(true)
        })

        it("Test buy tickets with ether",  async function() {
           
        })



        /*it("Test randomNumber Implementation", async function() {
            //await 
            await lottery.connect(owner).sendEth(accountWithLink.address, {value: toWei(1)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(1000))
           
           expect(await link.connect(accountWithLink).balanceOf(randomNumber.address)).to.be.equal(toWei(1000))

           const randomTransaction = await randomNumber.connect(owner).getRandomNumber()

           console.log(randomTransaction)

           //await vrfCoordinator.callBackWithRandomness(randomTransaction, '777', randomNumber.address)
           //let randomNumberValue = await randomNumber.randomResult()
           //console.log(randomNumberValue)
           //expect(randomNumberValue).to.be.equal(777)
        }) */

       /* it("Test creation of item in market", async function () {
            await market.connect(account1).sendEther(accountWithToken.address ,{value: toWei(10)})

            expect(await market.amountOfItems()).to.be.equal(0);
            expect(await market.itemIsInMarket(1)).to.be.equal(false);

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0);

            await expect(market.connect(accountWithToken).createOffer(parallel.address, 10254, 10, 100000000000000, 30)).to.be.revertedWith("You don't have enough tokens")
            await expect(market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 100, 30)).to.be.revertedWith("The deadline has to be after the creation of the token")

            await market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 1000000000000000, 30)  

            expect(await market.amountOfItems()).to.be.equal(1);
            expect(await market.itemIsInMarket(1)).to.be.equal(true);
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(1);     
        }) 

        it("Test payment with ethereum", async function () {
            await market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 1000000000000000, 1)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(1)

            await parallel.connect(accountWithToken).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithToken).balanceOf(accountWithToken.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(0)

            await expect(market.connect(account2).buyWithEther(2, {value: toWei(5)})).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account2).buyWithEther(1, {value: toWei(5)})).to.be.revertedWith("The amount of ether is not right")

            let amountOfEtherToPay = await market.connect(owner).getValueOfTokensInEther(1)

            await market.connect(account2).buyWithEther(1, {value: amountOfEtherToPay})

            expect(await parallel.connect(accountWithToken).balanceOf(accountWithToken.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0)
        })

        it("Test payment with Dai", async function () {
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)

            await market.connect(account2).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, account2.address, 10254)).to.be.equal(1)

            await parallel.connect(account2).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithToken).balanceOf(accountWithDai.address,10254)).to.be.equal(0)

            await expect(market.connect(account1).buyWithDai(2)).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account1).buyWithDai(1)).to.be.revertedWith("You don't have enough tokens")

            let priceInDai = await market.getValueOfTokensInDai(1)

            await dai.connect(accountWithDai).approve(market.address, priceInDai)
            await market.connect(accountWithDai).buyWithDai(1)

            expect(await parallel.connect(account2).balanceOf(account2.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithToken).balanceOf(accountWithDai.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0)
        })

        it("Test payment with Link", async function () {
            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(1)

            await market.connect(accountWithDai).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithDai.address, 10254)).to.be.equal(1)

            await parallel.connect(accountWithDai).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithDai).balanceOf(accountWithLink.address,10254)).to.be.equal(0)

            await expect(market.connect(account1).buyWithLink(2)).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account1).buyWithLink(1)).to.be.revertedWith("You don't have enough tokens")

            let priceInLink = await market.getValueOfTokensInLink(1)

            await link.connect(accountWithLink).approve(market.address, priceInLink)

            await market.connect(accountWithLink).buyWithLink(1)

            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithLink).balanceOf(accountWithLink.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithDai.address, 10254)).to.be.equal(0)
        })

        it("Test cancell offer", async function () {
            await expect(market.connect(account1).cancelOffer(2)).to.be.revertedWith("Item is not in market")

            expect(await parallel.connect(accountWithLink).balanceOf(accountWithLink.address,10254)).to.be.equal(1)

            await market.connect(accountWithLink).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.itemIsInMarket(1)).to.be.equal(true)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithLink.address, 10254)).to.be.equal(1)

            await expect(market.connect(account1).cancelOffer(1)).to.be.revertedWith("You are not the owner of the tokens")

            await market.connect(accountWithLink).cancelOffer(1)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithLink.address, 10254)).to.be.equal(0)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
        })

        it("Test fuctions that change transaction values", async function() {
					expect(await market.recipient()).to.be.equal(owner.address);
					expect(await market.fee()).to.be.equal(1);

					await market.changeRecipientAddress(account1.address)
					 await market.changePercentageOfFee(5)

					expect(await market.recipient()).to.be.equal(account1.address)
					expect(await market.fee()).to.be.equal(5);
				})*/   
    });
});
