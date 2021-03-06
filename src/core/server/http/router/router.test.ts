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

import { Router } from './router';
import { loggingServiceMock } from '../../logging/logging_service.mock';
const logger = loggingServiceMock.create().get();
describe('Router', () => {
  describe('Options', () => {
    it('throws if validation for a route is not defined explicitly', () => {
      const router = new Router('', logger);
      expect(
        // we use 'any' because validate is a required field
        () => router.get({ path: '/' } as any, (context, req, res) => res.ok({}))
      ).toThrowErrorMatchingInlineSnapshot(
        `"The [get] at [/] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation."`
      );
    });
    it('throws if validation for a route is declared wrong', () => {
      const router = new Router('', logger);
      expect(() =>
        router.get(
          // we use 'any' because validate requires @kbn/config-schema usage
          { path: '/', validate: { params: { validate: () => 'error' } } } as any,
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected a valid schema declared with '@kbn/config-schema' package at key: [params]."`
      );
    });
  });
});
