import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { MetaNft } from "../typechain";
import { TransferEvent } from "../typechain/MetaNft";

const { expect, assert } = chai.use(chaiAsPromised);

describe("MetaNft", function () {

  /////////////////
  // VARIABLES
  /////////////////
  let metaNftContract: MetaNft;
  let owner: Signer, recipient: Signer, relayer: Signer;
  let ownerAddr: string, recipientAddr: string, relayerAddr: string;

  /////////////////
  // BEFORE HOOK
  /////////////////
  beforeEach(async () => {
    const metaNftContractFactory = await ethers.getContractFactory("MetaNft");
    metaNftContract = await metaNftContractFactory.deploy();
    await metaNftContract.deployed();

    const signers = await ethers.getSigners();
    [owner, recipient, relayer] = [signers[1], signers[5], signers[7]];
    [ownerAddr, recipientAddr, relayerAddr] = await Promise.all([
      owner.getAddress(),
      recipient.getAddress(),
      relayer.getAddress()
    ]);
  });

  /////////////////
  // TEST
  /////////////////
  it("Meta transfer should work correctly", async function () {
    // Mint NFT to owner
    const txnMint = await metaNftContract.connect(owner).mintFree();
    const rcptMint = await txnMint.wait();
    const { args: { tokenId } } = rcptMint.events?.find(({ event }) => event === "Transfer") as TransferEvent;

    // Send NFT to recipient
    const nonce = Date.now();
    const signature = await owner.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "address", "address", "uint256"],
            [nonce, ownerAddr, recipientAddr, tokenId]
          )
        )
      ));
    const txnTransfer = await metaNftContract.connect(relayer).transferMeta(nonce, ownerAddr, recipientAddr, tokenId, signature);
    await txnTransfer.wait();

    // Test that transaction happened
    const newOwner = await metaNftContract.ownerOf(tokenId);
    assert.equal(newOwner, recipientAddr, "Recipient did not receive the NFT!");
  });

  it("Transaction replay should be prevented", async () => {
    // Submit transaction once
    const txnMint = await metaNftContract.connect(owner).mintFree();
    const rcptMint = await txnMint.wait();
    const { args: { tokenId } } = rcptMint.events?.find(({ event }) => event === "Transfer") as TransferEvent;
    const nonce = Date.now();
    const signature = await owner.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "address", "address", "uint256"],
            [nonce, ownerAddr, recipientAddr, tokenId]
          )
        )
      ));
    const txnTransfer = await metaNftContract.connect(relayer).transferMeta(nonce, ownerAddr, recipientAddr, tokenId, signature);
    await txnTransfer.wait();

    // Test replay
    const replayTransactionPromise = metaNftContract.connect(owner).transferMeta(nonce, ownerAddr, recipientAddr, tokenId, signature);
    expect(replayTransactionPromise).to.be.revertedWith("USED NONCE");
  });
});
