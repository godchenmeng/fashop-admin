import React, { Component } from "react";
import { connect } from "dva";
import PageHeaderWrapper from "@/components/pageHeaderWrapper";
import { Card } from "antd";
import OrderEditPrice from "@/components/order/editPrice/index";
import { Table } from "antd";
import { View } from "@/components/flexView";
import moment from "moment/moment";
import Image from "@/components/image/index";
import router from "umi/router";
import styles from "./list.css";
import PageList from "@/components/pageList";


@connect(({ order, loading }) => ({
    orderList: order.list.result,
    orderListLoading: loading.effects["order/list"]
}))
class List extends Component {

    static defaultProps = {
        orderListLoading: false,
        orderList: {}
    };

    constructor(props) {
        super(props);
        // 设置url里的订单状态（state_type）
        const {  location: { query: { state_type } } } = props;
        this.state = {
            orderId: 0,
            visible: false,
            expandedRowKeys: [],
            tabKey: state_type ? state_type : 'all'
        }
    }

    componentDidMount() {
        this.initList();
    }

    search = new PageList({
        router: () => {
            const { tabKey } = this.state;
            if (tabKey !== "all") {
                return `/order/list?state_type=${tabKey}`;
            } else {
                return `/order/list`;
            }
        },
        param: {
            keywords_type: "goods_name",
            keywords: null,
            create_time: [],
            order_type: null,
            group_state_type: null,
        },
        rule: [{ key: "keywords_type", rule: ["rely", "keywords"] }],
        refresh: (e) => {
            this.initList(e);
        }
    });


    initList = () => {
        const { dispatch } = this.props;
        const { tabKey } = this.state;
        let payload = this.search.filter();
        if (tabKey !== "all") {
            payload["state_type"] = tabKey;
        }
        dispatch({
            type: "order/list",
            payload,
            callback: (response) => {
                const { result: { list } } = response;
                this.setState({
                    expandedRowKeys: Array.isArray(list) ? list.map((item) => item.id) : []
                });
            }
        });
    };
    onTabChange = (key) => {
        this.setState({ tabKey: key }, () => {
            if (key !== "all") {
                router.push(`/order/list?state_type=${key}`);
            } else {
                router.push(`/order/list`);
            }
            // 重置搜索表单的值
            this.searchForm.resetValues();
            // 重置PageSearchList
            this.search.reset();
        });
    };

    render() {
        let { keywords_type, keywords, create_time, order_type, group_state_type } = this.search.getParam();
        const { orderList, orderListLoading } = this.props;
        let { expandedRowKeys } = this.state;
        let { list } = orderList;
        if (Array.isArray(list)) {
            list.map((item) => {
                item.extend_order_goods.map((goods) => {
                    goods["reciver_info"] = item.extend_order_extend.reciver_info;
                    goods["rows"] = item.extend_order_goods.length;
                    return goods;
                });
                return item;
            });
        }
        let tabList = state_type_list.map((item) => {
            return {
                key: item.value,
                tab: item.name
            };
        });
        tabList.unshift({
            key: "all",
            tab: "全部"
        });
        const group_search = Number(order_type) === 2 ? [{
            label: "订单状态",
            select: {
                field: "group_state_type",
                style: { width: 100 },
                placeholder: "全部状态",
                data: group_state_type_list,
                initialValue: group_state_type
            }
        }] : []
        const columns = [
            {
                title: "订单号",
                dataIndex: "sn",
                key: "sn",
                render:(text, record)=> Number(order_type)!==2 ? text : <div>
                    <div>{text}</div>
                    <div>
                        <span className={styles.name}>团编号：</span>
                        <a>{record.sn}</a>
                    </div>
                </div>
            }, {
                title: "下单时间",
                dataIndex: "create_time",
                key: "create_time",
                render: text => moment(text, "X").format("YYYY-MM-DD HH:mm:ss")
            }, {
                title: "订单状态",
                dataIndex: "state",
                key: "state",
                render: (text, record) => Number(order_type)!==2 ? this.returnOrderState(text) : <div>
                    <div>{this.returnOrderState(text)}</div>
                    <div>
                        <span className={styles.name}>拼团状态：</span>
                        <span className={styles.value}>{this.returnGroupOrderState(record.group_state_type)}</span>
                    </div>
                </div>
            },
            {
                title: "运费（元）",
                dataIndex: "freight_fee",
                key: "freight_fee",
                render: (value) => `¥${value}`
            }, {
                title: "商品总额（元）",
                dataIndex: "amount",
                key: "amount",
                render: (value) => `¥${value}`
            }, {
                title: "操作",
                key: "operation",
                render: (record) => <View className={styles.operation}>
                    {
                        record.state === 10 ? <a
                            onClick={() => {
                                this.editPrice.getWrappedInstance().show({
                                    orderId: record.id
                                });
                            }}
                        >
                            改价
                        </a> : null
                    }
                    <a
                        onClick={() => {
                            router.push(`/order/list/detail?id=${record.id}&group_id=${record.group_id}`);
                        }}
                    >
                        详情
                    </a>
                    {
                        Number(order_type)!==2 ? null : <a
                            onClick={() => {
                                // this.setState({ group_type: 1 }, () => {
                                //     router.push(`/order/list?group_type=1`);
                                //     // 重置搜索表单的值
                                //     this.searchForm.resetValues();
                                //     // 重置PageSearchList
                                //     this.search.reset();
                                // })
                            }}
                        >
                            查看同团订单
                        </a>
                    }
                    {
                        record.state === 20 ? <a
                            onClick={() => {
                                router.push(`/order/list/send?id=${record.id}`);
                            }}
                        >
                            发货
                        </a> : ""
                    }

                </View>
            }
        ];
        const expandedRowColumns = [
            {
                title: "商品图",
                dataIndex: "goods_img",
                key: "goods_img",
                className: `${styles.goodsGoodsImg} ${styles.borderRightNone}`,
                render: (e) => (
                    <Image
                        type='goods'
                        src={e}
                        style={{ width: 32, height: 32 }}
                    />
                )
            }, {
                title: "商品名称",
                dataIndex: "goods_title",
                key: "goods_title",
                className: `${styles.goodsTitle}`
            }, {
                title: "规格",
                dataIndex: "goods_spec",
                key: "goods_spec",
                className: `${styles.goodsSpec}`,
                render: (goods_spec) => {
                    return goods_spec[0].id > 0 ? goods_spec.map(function(item) {
                        return item.value_name + " ";
                    }) : "-";
                }
            }, {
                title: "数量",
                dataIndex: "goods_num",
                key: "goods_num",
                className: `${styles.goodsNum}`,
                render: (value) => {
                    return `${value} 件`;
                }
            }, {
                title: "单价",
                dataIndex: "goods_price",
                key: "goods_price",
                className: `${styles.goodsPrice}`,
                render: (value) => {
                    return `¥${value}`;
                }
            }, {
                title: "售后",
                dataIndex: "lock_state",
                key: "lock_state",
                render: (value, item) => {
                    if (item.lock_state === 1 && item.refund_id > 0) {
                        return <a onClick={() => {
                            router.push(`/order/refund/edit?id=${item.refund_id}`);
                        }}>退款中</a>;
                    }
                }
            }, {
                title: "收货人",
                dataIndex: "reciver_info.name",
                key: "reciver",
                className: `${styles.reciver} ${styles.borderLeft}`,
                render: (value, row, index) => {
                    return { children: `${value}`, props: { rowSpan: index === 0 ? row.rows : 0 } };
                }
            }
            , {
                title: "联系方式",
                dataIndex: "reciver_info.phone",
                key: "reciver_phone",
                className: `${styles.reciverPhone} ${styles.borderLeft}`,
                render: (value, row, index) => {
                    return { children: value, props: { rowSpan: index === 0 ? row.rows : 0 } };
                }
            },
            {
                title: "收货地址",
                dataIndex: "reciver_info.address",
                key: "reciver_address",
                className: `${styles.reciverAddress} ${styles.borderLeft}`,
                render: (value, row, index) => {
                    return { children: value, props: { rowSpan: index === 0 ? row.rows : 0 } };
                }
            }
        ];
        return (
            <PageHeaderWrapper hiddenBreadcrumb={true}>
                <OrderEditPrice ref={(e) => this.editPrice = e} />
                <Card 
                    bordered={false}
                    tabList={tabList}
                    activeTabKey={this.state.tabKey}
                    onTabChange={(key) => {
                        this.onTabChange(key);
                    }}
                >
                    <PageList.Search
                        wrappedComponentRef={(form) => this.searchForm = form}
                        ref={this.searchInstance}
                        loading={orderListLoading}
                        onSubmit={this.search.submit}
                        defaultValue={this.search.defaultParam}
                        onReset={this.search.reset}
                        items={[
                            {
                                selectInput: [
                                    {
                                        field: "keywords_type",
                                        style: { minWidth: 115 },
                                        initialValue: keywords_type,
                                        data: keywords_type_list
                                    },
                                    {
                                        field: "keywords",
                                        placeholder: "请输入关键词",
                                        initialValue: keywords
                                    }
                                ]
                            },
                            {
                                label: "下单时间",
                                timeRange: {
                                    field: "create_time",
                                    initialValue: create_time
                                }
                            },
                            {
                                label: "订单类型",
                                select: {
                                    field: "order_type",
                                    style: { width: 100 },
                                    placeholder: "全部类型",
                                    data: order_type_list,
                                    initialValue: order_type
                                }
                            }, ...group_search
                        ]} 
                    />
                    <Table
                        loading={orderListLoading}
                        dataSource={orderList.list ? orderList.list : []}
                        columns={columns}
                        expandedRowRender={record => (
                            <Table
                                dataSource={record.extend_order_goods}
                                columns={expandedRowColumns}
                                pagination={false}
                                defaultExpandAllRows={true}
                                rowKey={record => `${record.id}_child`}
                            />
                        )}
                        onExpand={(expanded, record) => {
                            expanded ? expandedRowKeys.push(record.id) : expandedRowKeys = expandedRowKeys.filter(v => v !== record.id);
                            this.setState({ expandedRowKeys });
                        }}
                        expandedRowKeys={expandedRowKeys}
                        pagination={{
                            showSizeChanger: false,
                            showQuickJumper: false,
                            current: this.search.page,
                            pageSize: this.search.rows,
                            total: orderList.total_number
                        }}
                        onChange={({ current }) => {
                            this.search.setPage(current).push();
                        }}
                        rowKey={record => record.id}
                    />
                </Card>
            </PageHeaderWrapper>
        );
    }

    returnOrderState(state) {
        switch (state) {
            case 0:
                return "已取消";
            case 10:
                return "未支付";
            case 20:
                return "待发货";
            case 30:
                return "已发货";
            case 40:
                return "已完成";
            default:
                return "";
        }
    }
    returnGroupOrderState(type) {
        switch (type) {
            case "group_state_new":
                return "待付款";
            case "group_state_pay":
                return "待开团";
            case "group_state_success":
                return "拼团成功";
            case "group_state_fail":
                return "拼团失败";
            default:
                return "";
        }
    }
}

const state_type_list = [
    {
        name: "待发货",
        value: "state_pay"
    }, {
        name: "待付款",
        value: "state_new"
    }, {
        name: "已发货",
        value: "state_send"
    }, {
        name: "已完成",
        value: "state_success"
    }, {
        name: "已关闭",
        value: "state_cancel"
    }
];
const order_type_list = [
    {
        name: "普通订单",
        value: "1"
    }, {
        name: "拼团订单",
        value: "2"
    }
];

const group_state_type_list = [
    {
        name: "待付款",
        value: "group_state_new"
    }, {
        name: "待成团",
        value: "group_state_pay"
    }, {
        name: "拼团成功",
        value: "group_state_success"
    }, {
        name: "拼团失败",
        value: "group_state_fail"
    }
];

const keywords_type_list = [
    {
        name: "商品名称",
        value: "goods_name"
    },
    {
        name: "订单号",
        value: "order_no"
    },
    {
        name: "收货人姓名",
        value: "receiver_name"
    },
    {
        name: "收货人电话",
        value: "receiver_phone"
    },
    {
        name: "快递单号",
        value: "courier_number"
    }
];

export default List;
