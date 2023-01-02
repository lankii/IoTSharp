import { Graph, Edge, Shape, NodeView } from '@antv/x6';

export class GateWay extends Shape.Rect {

    bizdata={};

    getInPorts() {
      return this.getPortsByGroup('in');
    }

    getOutPorts() {
      return this.getPortsByGroup('out');
    }

    getUsedInPorts(graph: Graph) {
      const incomingEdges = graph.getIncomingEdges(this) || [];
      return incomingEdges.map((edge: Edge) => {
        const portId = edge.getTargetPortId();
        return this.getPort(portId!);
      });
    }

    getNewInPorts(length: number) {
      return Array.from(
        {
          length,
        },
        () => {
          return {
            group: 'in',
          
          };
        }
      );
    }

    updateInPorts(graph: Graph) {
      const minNumberOfPorts = 0;
      const ports = this.getInPorts();
      const usedPorts = this.getUsedInPorts(graph);
      const newPorts = this.getNewInPorts(Math.max(minNumberOfPorts - usedPorts.length, 1));

      if (ports.length === minNumberOfPorts && ports.length - usedPorts.length > 0) {
        // noop
      } else if (ports.length === usedPorts.length) {
        this.addPorts(newPorts);
      } else if (ports.length + 1 > usedPorts.length) {
        this.prop(['ports', 'items'], this.getOutPorts().concat(usedPorts).concat(newPorts), {
          rewrite: true,
        });
      }

      return this;
    }
  }

  // GateWay.config({
  //   style: {
  //     padding: 40
  //   },
  //   attrs: {
  //     root: {
  //       magnet: false
  //     },
  //     body: {
  //       fill: '#ffa940',
  //       stroke: '#d9d9d9',
  //       strokeWidth: 1
  //     }
  //   },
  //   ports: {
  //     groups: {
  //       in: {
  //         label: {
  //           position: 'left'
  //         },
  //         position: {
  //           name: 'right'
  //         },
  //         attrs: {
  //           portBody: {
  //             magnet: 'passive',
  //             r: 6,
  //             stroke: '#ff0000',
  //             fill: '#fff',
  //             strokeWidth: 2
  //           }
  //         }
  //       },
  //       out: {
  //         position: {
  //           name: 'left'
  //         },
  //         label: {
  //           position: 'right'
  //         },
  //         attrs: {
  //           portBody: {
  //             magnet: true,
  //             r: 6,
  //             fill: '#fff',
  //             stroke: '#3199FF',
  //             strokeWidth: 2
  //           }
  //         }
  //       }
  //     }
  //   },
  //   portMarkup: [
  //     {
  //       tagName: 'circle',
  //       selector: 'portBody'
  //     }
  //   ]
  // });
  