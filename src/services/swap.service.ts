import Chains from '../config/chains.json';
import { LiFi, Route as lifiRoute } from '@lifi/sdk';
import { sortData } from '../utils/customSort';
import { QuoteSimulationResult, RangoClient } from 'rango-sdk-basic';
// import { Symbiosis, Token, TokenAmount } from 'symbiosis-js-sdk';
import {
  ConvertLifiRoute,
  ConvertRangoRoute,
  ConvertSymbiosisRoute,
  IFoundedRoutes,
  IRouteInfo,
  IRouteRequest,
  ISwapExactInSymbiosis,
  TSelectedRoute,
} from './types';
import checkNativeToken from '../utils/checkNative';
import { config } from './symbiosisConfig';

enum RouteType {
  Rango,
  Lifi,
  Symbiosis,
}

export default class Swap {
  private Lifi: LiFi;
  private Rango: RangoClient;
  // private symbiosis: Symbiosis;
  constructor() {
    this.Lifi = new LiFi({
      integrator: 'piper.finance',
    });
    this.Rango = new RangoClient('a43dfccc-bb38-48f7-9ac9-5b928df2ecc0');
    // this.symbiosis = new Symbiosis(config, 'piper.finance');
  }

  public async getRoutes(data: IRouteRequest): Promise<IRouteInfo[]> {
    const [lifiResult, rangoResult] = await Promise.all([
      this.getLifiRoutes(data),
      // this.getSymbiosisRoutes(data),
      this.getRangoRoutes(data),
    ]);

    return this.handleConvertRoutes(
      {
        lifi: lifiResult,
        rango: rangoResult,
      },
      data
    );
  }

  private async getLifiRoutes(
    data: IRouteRequest
  ): Promise<lifiRoute[] | undefined> {
    const { amount, fromToken, toToken, slippage } = data;
    try {
      const lifiResult = await this.Lifi.getRoutes({
        fromChainId: fromToken.chainId,
        fromTokenAddress: fromToken.address,
        toChainId: toToken.chainId,
        toTokenAddress: toToken.address,
        fromAmount: amount,
        options: {
          slippage: slippage / 100,
          order: 'RECOMMENDED',
        },
      });

      return lifiResult.routes;
    } catch (err) {}
  }

  // private async getSymbiosisRoutes(
  //   data: IRouteRequest
  // ): Promise<ISwapExactInSymbiosis | undefined> {
  //   try {
  //     const tokenIn = new Token({
  //       chainId: data.fromToken.chainId,
  //       address: checkNativeToken(data.fromToken.address)
  //         ? ''
  //         : data.fromToken.address,
  //       name: data.fromToken.name,
  //       isNative: checkNativeToken(data.fromToken.address) ? true : false,
  //       symbol: data.fromToken.symbol,
  //       decimals: data.fromToken.decimals,
  //     });
  //     const tokenAmountIn = new TokenAmount(tokenIn, data.amount);
  //     const tokenOut = new Token({
  //       chainId: data.toToken.chainId,
  //       address: checkNativeToken(data.toToken.address)
  //         ? ''
  //         : data.toToken.address,
  //       name: data.toToken.name,
  //       isNative: checkNativeToken(data.toToken.address) ? true : false,
  //       symbol: data.toToken.symbol,
  //       decimals: data.toToken.decimals,
  //     });

  //     const swapping = this.symbiosis.newSwapping();
  //     const routes = await swapping.exactIn(
  //       tokenAmountIn,
  //       tokenOut,
  //       data.address,
  //       data.address,
  //       data.address,
  //       data.slippage * 100,
  //       Date.now() + 20 * 60
  //     );

  //     return routes;
  //   } catch (e) {}
  // }

  private async getRangoRoutes(
    data: IRouteRequest
  ): Promise<QuoteSimulationResult | null | undefined> {
    try {
      const { fromToken, toToken } = data;

      const sourceToken = Chains.find(
        (chain) => chain.id === fromToken.chainId
      );
      const destinationToken = Chains.find(
        (chain) => chain.id === toToken.chainId
      );

      if (!sourceToken || !destinationToken) return null;
      const routes = await this.Rango.quote({
        from: {
          blockchain: sourceToken.name.toUpperCase(),
          symbol: fromToken.symbol.toUpperCase(),
          address: fromToken.address.toLowerCase(),
        },
        to: {
          blockchain: destinationToken.name.toUpperCase(),
          symbol: toToken.symbol.toUpperCase(),
          address: toToken.address.toLowerCase(),
        },
        amount: data.amount,
      });

      return routes.route;
    } catch (err) {}
  }

  private handleConvertRoutes(
    routes: IFoundedRoutes,
    swapData: IRouteRequest
  ): IRouteInfo[] {
    const routeData = [
      { type: RouteType.Lifi, data: routes?.lifi },
      // { type: RouteType.Symbiosis, data: routes?.symbiosis },
      { type: RouteType.Rango, data: routes?.rango },
    ];
    const parsedRoutes: IRouteInfo[] = [];
    for (const { type, data } of routeData) {
      if (Array.isArray(data)) {
        data.forEach((route) =>
          parsedRoutes.push(this.showRoutesInfo(route, type, swapData))
        );
      } else if (data) {
        parsedRoutes.push(this.showRoutesInfo(data!, type, swapData));
      }
    }

    return sortData(
      parsedRoutes,
      'amountOut',
      'amountOutValue',
      'totalGasFee',
      'estimateTime'
    );
  }

  private showRoutesInfo(
    route: TSelectedRoute,
    type: RouteType,
    swapData: IRouteRequest
  ): IRouteInfo {
    switch (type) {
      case RouteType.Rango:
        return new ConvertRangoRoute(route as QuoteSimulationResult, swapData)
          ._ROUTE;
      case RouteType.Lifi:
        return new ConvertLifiRoute(route as lifiRoute, swapData)._ROUTE;
      case RouteType.Symbiosis:
        return new ConvertSymbiosisRoute(
          route as ISwapExactInSymbiosis,
          swapData
        )._ROUTE;
    }
  }
}
