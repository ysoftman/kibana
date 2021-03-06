/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('create', () => {
    const createdAlertIds: Array<{ space: string; id: string }> = [];

    before(() => esArchiver.load('actions/basic'));
    after(async () => {
      await Promise.all(
        createdAlertIds.map(({ space, id }) => {
          const urlPrefix = space !== 'default' ? `/s/${space}` : '';
          return supertest
            .delete(`${urlPrefix}/api/alert/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');
        })
      );
      await esArchiver.unload('actions/basic');
    });

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should return 200 when creating an alert', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then(async (resp: any) => {
          createdAlertIds.push({ space: 'default', id: resp.body.id });
          expect(resp.body).to.eql({
            id: resp.body.id,
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  message:
                    'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
            enabled: true,
            alertTypeId: 'test.noop',
            alertTypeParams: {},
            interval: '10s',
            scheduledTaskId: resp.body.scheduledTaskId,
          });
          expect(typeof resp.body.scheduledTaskId).to.be('string');
          const { _source: taskRecord } = await getScheduledTask(resp.body.scheduledTaskId);
          expect(taskRecord.type).to.eql('task');
          expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: resp.body.id,
            spaceId: 'default',
          });
        });
    });

    it('should return 200 when creating an alert in a space', async () => {
      const { body: createdAlert } = await supertest
        .post('/s/space_1/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      createdAlertIds.push({ space: 'space_1', id: createdAlert.id });
      expect(createdAlert).to.eql({
        id: createdAlert.id,
        actions: [
          {
            group: 'default',
            id: ES_ARCHIVER_ACTION_ID,
            params: {
              message:
                'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
            },
          },
        ],
        enabled: true,
        alertTypeId: 'test.noop',
        alertTypeParams: {},
        interval: '10s',
        scheduledTaskId: createdAlert.scheduledTaskId,
      });
      expect(typeof createdAlert.scheduledTaskId).to.be('string');
      const { _source: taskRecord } = await getScheduledTask(createdAlert.scheduledTaskId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: createdAlert.id,
        spaceId: 'space_1',
      });
    });

    it('should not schedule a task when creating a disabled alert', async () => {
      const { body: createdAlert } = await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }))
        .expect(200);
      expect(createdAlert.scheduledTaskId).to.eql(undefined);
    });

    it(`should return 400 when alert type isn't registered`, async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.unregistered-alert-type',
          })
        )
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Alert type "test.unregistered-alert-type" is not registered.',
          });
        });
    });

    it('should return 400 when payload is empty and invalid', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'child "alertTypeId" fails because ["alertTypeId" is required]. child "interval" fails because ["interval" is required]. child "alertTypeParams" fails because ["alertTypeParams" is required]. child "actions" fails because ["actions" is required]',
            validation: {
              source: 'payload',
              keys: ['alertTypeId', 'interval', 'alertTypeParams', 'actions'],
            },
          });
        });
    });

    it(`should return 400 when alertTypeParams isn't valid`, async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.validation',
          })
        )
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it(`should return 400 when interval is wrong syntax`, async () => {
      const { body: error } = await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ interval: '10x' }))
        .expect(400);
      expect(error).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'child "interval" fails because ["interval" with value "10x" fails to match the seconds (5s) pattern, "interval" with value "10x" fails to match the minutes (5m) pattern, "interval" with value "10x" fails to match the hours (5h) pattern, "interval" with value "10x" fails to match the days (5d) pattern]',
        validation: {
          source: 'payload',
          keys: ['interval', 'interval', 'interval', 'interval'],
        },
      });
    });

    it(`should return 400 when interval is 0`, async () => {
      const { body: error } = await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ interval: '0s' }))
        .expect(400);
      expect(error).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'child "interval" fails because ["interval" with value "0s" fails to match the seconds (5s) pattern, "interval" with value "0s" fails to match the minutes (5m) pattern, "interval" with value "0s" fails to match the hours (5h) pattern, "interval" with value "0s" fails to match the days (5d) pattern]',
        validation: {
          source: 'payload',
          keys: ['interval', 'interval', 'interval', 'interval'],
        },
      });
    });
  });
}
