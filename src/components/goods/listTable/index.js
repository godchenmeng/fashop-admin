//@flow
import React, { Component } from "react";
import { Table, Button, Switch, Modal,InputNumber, message } from "antd";
import styles from "./index.css";
import { View } from "react-web-dom";
import { connect } from "react-redux";
import { dispatchType, historyType } from "../../../utils/flow";
import { dispatchProps } from "../../../utils/defaultProps";
import { getGoodsList } from "../../../actions/goods";
import { getGoodsCategoryList } from "../../../actions/goods/category";
import Image from '../../image'
import moment from 'moment'
import Query from "../../../utils/query";
import Fetch from "../../../utils/fetch";
import { GoodsApi } from "../../../config/api/goods";

type Props = {
    history: historyType,
    dispatch: dispatchType,
    loading: boolean,
    listData: {
        page: number,
        rows: number,
        total_number: number,
        list: Array<{}>,
    },
    categoryList: Array<{ id: number, name: string }>,
}

type State = {
    rowSelectionIds: Array<string>,
    delIds: Array<number>
}

@connect(({
              view: {
                  goods: {
                      loading,
                      listData,
                      categoryList
                  }
              }
          }) => ({
    loading,
    listData,
    categoryList,
}))
export default class GoodsListTable extends Component <Props, State> {
    static defaultProps = {
        dispatch: dispatchProps,
        loading: false,
        listData: [],
    }
    state = {
        rowSelectionIds: [],
        delIds: [],
    }

    componentDidMount() {
        this.getGoodsList()
    }
    getGoodsList(){
        const { dispatch, categoryList, } = this.props
        const params = Query.invokerForListParams([
            { key: 'sale_state', rule: ['eq', 'all'] },
            { key: 'is_hot_sale', rule: ['eq', 'all'] },
            { key: 'order_type', rule: ['eq', 'all'] },
        ])
        dispatch(getGoodsList({ params }))
        if (!categoryList.length) {
            dispatch(getGoodsCategoryList())
        }
    }

    render() {
        const { loading, listData, categoryList, history, } = this.props
        const { page, rows, total_number, list, } = listData
        const { delIds } = this.state
        let goodsList = []

        Array.isArray(list) && list.length > 0 && list.map((goods: any) => {
            if (delIds.indexOf(goods.id) === -1) {
                goodsList.push(goods)
            }
        })

        const columns = [
            {
                title: "商品图",
                dataIndex: 'img',
                width: 50,
                render: (e) => (
                    <Image
                        type='goods'
                        src={e}
                        style={{ width: 50, height: 50 }}
                    />
                )
            }, {
                title: "商品标题",
                dataIndex: "title",
                width: 230
            }, {
                title: "价格（元）",
                dataIndex: "price",
                width: 120,
            }, {
                title: "销量",
                dataIndex: "base_sale_num",
                width: 80,
            }, {
                title: "库存",
                dataIndex: "stock",
                width: 80,
            }, {
                title: "分类",
                dataIndex: "category_ids",
                render: (e) => {
                    const textArray = e ? e.map((a) => {
                        const index = categoryList.findIndex((c) => c.id === Number(a))
                        if (index !== -1) {
                            return categoryList[index].name
                        } else {
                            return null
                        }
                    }) : []
                    const newArray = textArray.filter((e) => e)
                    return newArray.join('，')
                },
                width: 200,

            }, {
                title: "创建时间",
                dataIndex: "create_time",
                render: e => moment(e * 1000).format('YYYY-MM-DD hh:mm'),
                width: 200,
            }, {
                title: "上架状态",
                dataIndex: "is_on_sale",
                render: (text, record) => <Switch
                    defaultChecked={!!text}
                    onChange={async (checked) => {
                        if (checked) {
                            const response = await Fetch.fetch({
                                api: GoodsApi.onSale,
                                params: { ids: [record.id] }
                            })
                            if (response.code === 0) {
                                this.getGoodsList()
                            }
                        } else {
                            const response = await Fetch.fetch({
                                api: GoodsApi.offSale,
                                params: { ids: [record.id] }
                            })
                            if (response.code === 0) {
                                this.getGoodsList()
                            }
                        }
                    }}
                />
            }, {
                title: "总店推荐",
                dataIndex: "is_hot_sale",
                render: (text, record) => <Switch
                    defaultChecked={!!text}
                    onChange={async (checked) => {
                        if (checked) {
                            const response = await Fetch.fetch({
                                api: GoodsApi.hotSale,
                                params: { ids: [record.id] }
                            })
                            if (response.code === 0) {
                                this.getGoodsList()
                            }
                        } else {
                            const response = await Fetch.fetch({
                                api: GoodsApi.unHotSale,
                                params: { ids: [record.id] }
                            })
                            if (response.code === 0) {
                                this.getGoodsList()
                            }
                        }
                    }}
                />
            }, {
                title: "推荐排序",
                dataIndex: "hot_sale_index",
                render: (text, record) => <InputNumber
                    defaultValue={text}
                    style={{ width: 60,textAlign: "center" }}
                    onChange={async (val) => {
                        const response = await Fetch.fetch({
                            api: GoodsApi.hotSaleIndex,
                            params: { id: record.id,index:val }
                        })
                        if (response.code === 0) {
                            this.getGoodsList()
                        }
                    }}
                />
            }, {
                title: '操作',
                key: 'operation',
                className: styles.column,
                width: 100,
                render: (record) => <View className={styles.operation}>
                    <a
                        onClick={() => {
                            this.props.history.push({
                                pathname: `/goods/list/edit`,
                                search: `?id=${record.id}`,
                                state: {
                                    record,
                                }
                            })
                        }}
                    >
                        编辑
                    </a>
                    <a
                        onClick={async () => {
                            Modal.confirm({
                                title: '确认删除？',
                                okText: '确认',
                                okType: 'danger',
                                cancelText: '取消',
                                onOk: async () => {
                                    const response = await Fetch.fetch({
                                        api: GoodsApi.del,
                                        params: { ids: [record.id] }
                                    })
                                    if (response.code === 0) {
                                        this.setState({
                                            delIds: [...delIds, record.id]
                                        }, () => {
                                            message.success('已删除', 1)
                                        })
                                    }
                                }
                            })

                        }}
                    >删除</a>
                </View>
            }
        ]
        return (
            <View>
                <View className={styles.batchView}>
                    <Button
                        type='primary'
                        onClick={() => {
                            history.push('/goods/list/add')
                        }}
                    >
                        添加商品
                    </Button>
                </View>
                <Table
                    defaultExpandAllRows
                    dataSource={goodsList}
                    columns={columns}
                    rowKey={record => record.id}
                    pagination={{
                        showSizeChanger: false,
                        showQuickJumper: false,
                        pageSize: rows,
                        total: total_number,
                        current: page,
                    }}
                    loading={loading}
                    onChange={({ current, pageSize }) => {
                        this.props.history.push(Query.page(current, pageSize))
                    }}
                />
            </View>
        )
    }
}
