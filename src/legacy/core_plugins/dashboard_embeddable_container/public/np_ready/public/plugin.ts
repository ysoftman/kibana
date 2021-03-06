/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { CONTEXT_MENU_TRIGGER, Plugin as EmbeddablePlugin } from './lib/embeddable_api';
import { ExpandPanelAction, DashboardContainerFactory, DashboardCapabilities } from './lib';
import { Start as InspectorStartContract } from '../../../../../../plugins/inspector/public';

interface SetupDependencies {
  embeddable: ReturnType<EmbeddablePlugin['setup']>;
}

interface StartDependencies {
  embeddable: ReturnType<EmbeddablePlugin['start']>;
  inspector: InspectorStartContract;
  __LEGACY: {
    SavedObjectFinder: React.ComponentType<any>;
    ExitFullScreenButton: React.ComponentType<any>;
  };
}

export type Setup = void;
export type Start = void;

export class DashboardEmbeddableContainerPublicPlugin
  implements Plugin<Setup, Start, SetupDependencies, StartDependencies> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: SetupDependencies): Setup {
    const expandPanelAction = new ExpandPanelAction();
    embeddable.registerAction(expandPanelAction);
    embeddable.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction.id);
  }

  public start(core: CoreStart, plugins: StartDependencies): Start {
    const { application, notifications, overlays } = core;
    const { embeddable, inspector, __LEGACY } = plugins;

    const dashboardOptions = {
      capabilities: (application.capabilities.dashboard as unknown) as DashboardCapabilities,
      getFactory: embeddable.getEmbeddableFactory,
    };
    const factory = new DashboardContainerFactory(dashboardOptions, {
      getActions: embeddable.getTriggerCompatibleActions,
      getAllEmbeddableFactories: embeddable.getEmbeddableFactories,
      getEmbeddableFactory: embeddable.getEmbeddableFactory,
      notifications,
      overlays,
      inspector,
      SavedObjectFinder: __LEGACY.SavedObjectFinder,
      ExitFullScreenButton: __LEGACY.ExitFullScreenButton,
    });

    embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  public stop() {}
}
