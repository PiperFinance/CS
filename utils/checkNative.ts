export default function checkNativeToken(tokenAddress: string) {
  return (
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase() === tokenAddress.toLowerCase()
  );
}
