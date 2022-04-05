// scripts/deploy_upgradeable_box.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    const RandomNumber = await ethers.getContractFactory("RandomNumber")
    const randomNumber = await RandomNumber.deploy()
    await randomNumber.deployed()

    const Lottery = await ethers.getContractFactory("Lottery");
	const lottery = await upgrades.deployProxy(Lottery, [randomNumber.address], {
		initializer: "initialize",
	});
	await lottery.deployed();
	console.log("Lottery deployed to:", lottery.address);
}
main();