//
// this script executes when you run 'yarn harhat:test'
//

import hre from "hardhat";
import { expect } from "chai";
import { Vendor, MemeCoin } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("🚩 Assignment 1: 🏵 Token Vendor 🤖", function () {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  let yourToken: MemeCoin;
  let yourTokenAddress = "";

  let vendor: Vendor;
  let vendorAddress = "";

  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  let tokenContractArtifact = "";
  if (contractAddress) {
    tokenContractArtifact = `contracts/MemeCoinAutograder.sol:MemeCoin`;
  } else {
    tokenContractArtifact = "contracts/MemeCoin.sol:MemeCoin";
  }

  before(async () => {
    // Get the Signers object from ethers
    [owner, user1, user2, user3] = await ethers.getSigners();
  });

  it("Should deploy MemeCoin", async function () {
    const MemeCoinFactory = await ethers.getContractFactory(tokenContractArtifact);

    yourToken = (await MemeCoinFactory.deploy(owner.address)) as MemeCoin;
    yourTokenAddress = await yourToken.getAddress();

    vendorAddress = await yourToken.vendorAddress();
    vendor = (await ethers.getContractAtWithSignerAddress("Vendor", vendorAddress, owner.address)) as Vendor;
  });

  describe("totalSupply()", function () {
    it("Should have a total supply of at least 1000", async function () {
      const totalSupply = await yourToken.totalSupply();
      const totalSupplyInt = parseInt(ethers.formatEther(totalSupply));
      console.log("\t", " 🧾 Total Supply:", totalSupplyInt);
      expect(totalSupplyInt).to.greaterThan(999);
    });
  });

  let contractArtifact = "";
  if (process.env.CONTRACT_ADDRESS) {
    contractArtifact = `contracts/download-${process.env.CONTRACT_ADDRESS}.sol:Vendor`;
  } else {
    contractArtifact = "contracts/Vendor.sol:Vendor";
  }

  describe(" 💵 buyTokens()", function () {
    it("Should let us buy tokens and our balance should go up...", async function () {
      const [owner] = await ethers.getSigners();
      console.log("\t", " 🧑 Tester Address: ", owner.address);

      const startingBalance: bigint = await yourToken.balanceOf(owner.address);
      console.log("\t", " ⚖  Starting Token balance: ", ethers.formatEther(startingBalance));

      console.log("\t", " 💸 Buying...");
      const buyTokensResult = await vendor.buyTokens({ value: ethers.parseEther("0.001") });
      console.log("\t", " 🏷  buyTokens Result: ", buyTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const txResult = await buyTokensResult.wait();
      expect(txResult?.status).to.equal(1);

      const newBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " 🔎 New Token balance: ", ethers.formatEther(newBalance));
      expect(newBalance).to.equal(startingBalance + ethers.parseEther("0.1"));
    });
  });

  describe(" 💵 sellTokens()", function () {
    it("Should let us sell tokens and we should get the appropriate amount eth back...", async function () {
      const startingETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " ⚖  Starting ETH balance: ", ethers.formatEther(startingETHBalance));

      const startingBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " ⚖  Starting Token balance: ", ethers.formatEther(startingBalance));

      console.log("\t", " 🙄 Approving...");
      const approveTokensResult = await yourToken.approve(vendorAddress, ethers.parseEther("0.1"));
      console.log("\t", " 🏷  approveTokens Result: ", approveTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const atxResult = await approveTokensResult.wait();
      expect(atxResult?.status).to.equal(1, "Error when expecting the transaction result to equal 1");

      console.log("\t", " 🍾 Selling...");
      const sellTokensResult = await vendor.sellTokens(ethers.parseEther("0.1"));
      console.log("\t", " 🏷  sellTokens Result: ", sellTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const txResult = await sellTokensResult.wait();
      expect(txResult?.status).to.equal(1, "Error when expecting the transaction status to equal 1");

      const newBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " 🔎 New Token balance: ", ethers.formatEther(newBalance));
      expect(newBalance).to.equal(
        startingBalance - ethers.parseEther("0.1"),
        "Error when expecting the token balance to have increased by 0.1",
      );

      const newETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " 🔎 New ETH balance: ", ethers.formatEther(newETHBalance));
      const ethChange = newETHBalance - startingETHBalance;
      // check
      expect(ethChange).to.greaterThan(
        100_000_000_000_000,
        "Error when expecting the ether returned to the user by the sellTokens function to be correct",
      );
    });
  });

  describe(" 💵 withdraw()", function () {
    it("Should let the owner (and nobody else) withdraw the eth from the contract...", async function () {
      const [owner, nonOwner] = await ethers.getSigners();

      console.log("\t", " 💸 Buying some tokens...");
      const buyTokensResult = await vendor.connect(nonOwner).buyTokens({
        value: ethers.parseEther("0.1"),
      });
      console.log("\t", " 🏷  buyTokens Result: ", buyTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const buyTxResult = await buyTokensResult.wait();
      expect(buyTxResult?.status).to.equal(1, "Error when expecting the transaction result to be 1");

      const vendorETHBalance = await ethers.provider.getBalance(vendorAddress);
      console.log("\t", " ⚖  Starting Vendor contract ETH balance: ", ethers.formatEther(vendorETHBalance));

      console.log("\t", " 🍾 Withdrawing as non-owner (should fail)...");
      const startingNonOwnerETHBalance = await ethers.provider.getBalance(nonOwner.address);
      console.log("\t", " ⚖  Starting non-owner ETH balance: ", ethers.formatEther(startingNonOwnerETHBalance));

      await expect(vendor.connect(nonOwner).withdraw()).to.be.reverted;
      console.log("\t", " 🏷  withdraw reverted as non-owner");

      const newNonOwnerETHBalance = await ethers.provider.getBalance(nonOwner.address);
      console.log("\t", " 🔎 New non-owner ETH balance: ", ethers.formatEther(newNonOwnerETHBalance));
      expect(newNonOwnerETHBalance).to.be.lte(
        startingNonOwnerETHBalance,
        "Error when expecting the new eth balance to be <= to the previous balance after calling withdraw by a non owner",
      );

      console.log("\t", " 🍾 Withdrawing as owner...");
      const startingOwnerETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " ⚖  Starting owner ETH balance: ", ethers.formatEther(startingOwnerETHBalance));
      const withdrawResult = await vendor.withdraw();
      console.log("\t", " 🏷  withdraw Result: ", withdrawResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const withdrawTxResult = await withdrawResult.wait();
      expect(withdrawTxResult?.status).to.equal(1, "Error when expecting the withdraw transaction to equal 1");

      const newOwnerETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " 🔎 New owner ETH balance: ", ethers.formatEther(newOwnerETHBalance));

      const tx = await ethers.provider.getTransaction(withdrawResult.hash);
      if (!tx) {
        throw new Error("Cannot resolve transaction");
      }
      const receipt = await ethers.provider.getTransactionReceipt(withdrawResult.hash);
      if (!receipt) {
        throw new Error("Cannot resolve receipt");
      }
      const gasCost = tx.gasPrice * receipt.gasUsed;

      expect(newOwnerETHBalance).to.equal(
        startingOwnerETHBalance + vendorETHBalance - gasCost,
        "Error when expecting the owner's ether returned by withdraw to be sufficient",
      );
    });
  });
});
