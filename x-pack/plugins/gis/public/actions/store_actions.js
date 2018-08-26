/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH } from '../../common/constants';
import { getLayerList, getMapState } from '../selectors/map_selectors';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const CLEAR_TEMPORARY_LAYERS = 'CLEAR_TEMPORARY_LAYERS';
export const SET_META = 'SET_META';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';
export const MAP_EXTENT_CHANGED = 'MAP_EXTENT_CHANGED';
export const LAYER_DATA_LOAD_STARTED = 'LAYER_DATA_LOAD_STARTED';
export const LAYER_DATA_LOAD_ENDED = 'LAYER_DATA_LOAD_ENDED';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

export function toggleLayerVisible(layerId) {
  return {
    type: TOGGLE_LAYER_VISIBLE,
    layerId
  };}

export function setSelectedLayer(layerId) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayerId: layerId
  };
}

export function updateLayerOrder(newLayerOrder) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder
  };
}

export function addLayer(layer, position = -1) {
  return async dispatch => {
    dispatch({
      type: ADD_LAYER,
      layer,
      position
    });
  };
}

export function promoteTemporaryLayers() {
  return {
    type: PROMOTE_TEMPORARY_LAYERS
  };
}

export function clearTemporaryLayers() {
  return {
    type: CLEAR_TEMPORARY_LAYERS
  };
}

export function mapExtentChanged(newMapConstants) {
  return async (dispatch, getState) => {
    window._gs = getState;
    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapState: newMapConstants
    });

    const layerList = getLayerList(getState());
    layerList.forEach((layer) => {
      layer.syncDataToMapState(newMapConstants, Symbol('data_request_sync_extentchange'), dispatch);
    });
  };
}

export function startDataLoad(layerId, dataMeta, requestToken) {
  return ({
    type: LAYER_DATA_LOAD_STARTED,
    layerId: layerId,
    dataMeta: dataMeta,
    requestToken: requestToken
  });
}

//todo: should link start and end data load with some sort of token
export function endDataLoad(layerId, data, requestToken) {
  return ({
    type: LAYER_DATA_LOAD_ENDED,
    layerId: layerId,
    data: data,
    requestToken: requestToken
  });
}


export function addInitialData(layer) {
  return async (dispatch, getState) => {
    const mapState = getMapState(getState());
    layer.syncDataToMapState(mapState, Symbol('data_request'), dispatch);
  };
}

export function addLayerFromSource(source, layerOptions = {}, position) {
  return async (dispatch, getState) => {
    const layer = source.createDefaultLayer(layerOptions, getState().config.meta.data_sources);
    const layerDescriptor = layer.toLayerDescriptor();
    await dispatch(addLayer(layerDescriptor, position));
    dispatch(addInitialData(layer));
  };
}

export function addEMSTMSFromSource(sourceDescriptor, options = {}, position) {
  return async (dispatch) => {
    const source = new EMSTMSSource(sourceDescriptor);
    dispatch(addLayerFromSource(source, options, position));
  };
}

export function removeLayer(id) {
  return {
    type: REMOVE_LAYER,
    id
  };
}

export function setMeta(metaJson) {
  return async dispatch => {
    dispatch({
      type: SET_META,
      meta: metaJson
    });
  };
}

export async function loadMapResources(dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));

  // Add initial layers
  //todo: ensure we can declaritively add this (even when meta data isn't available yet)
  const roadMapEms = EMSTMSSource.createDescriptor('road_map');
  await dispatch(addEMSTMSFromSource(roadMapEms, {}, 0));

}
