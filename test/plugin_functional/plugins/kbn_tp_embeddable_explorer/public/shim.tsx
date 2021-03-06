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

import 'ui/autoload/all';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';

import uiRoutes from 'ui/routes';

// @ts-ignore
import { uiModules } from 'ui/modules';

import { Plugin } from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { npStart } from '../../../../../src/legacy/ui/public/new_platform';

import template from './index.html';

export interface PluginShim {
  embeddable: ReturnType<Plugin['setup']>;
}

const { inspector } = npStart.plugins;

export interface CoreShim {
  inspector: typeof inspector;
  onRenderComplete: (listener: () => void) => void;
}

const plugins: PluginShim = {
  embeddable: start,
};

let rendered = false;
const onRenderCompleteListeners: Array<() => void> = [];
const coreShim: CoreShim = {
  inspector,
  onRenderComplete: (renderCompleteListener: () => void) => {
    if (rendered) {
      renderCompleteListener();
    } else {
      onRenderCompleteListeners.push(renderCompleteListener);
    }
  },
};

uiRoutes.enable();
uiRoutes.defaults(/\embeddable_explorer/, {});
uiRoutes.when('/', {
  template,
  controller($scope) {
    $scope.$$postDigest(() => {
      rendered = true;
      onRenderCompleteListeners.forEach(listener => listener());
    });
  },
});

export function createShim(): { core: CoreShim; plugins: PluginShim } {
  return {
    core: coreShim,
    plugins,
  };
}
